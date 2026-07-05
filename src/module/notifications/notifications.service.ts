import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format } from 'date-fns';
import { Notification } from './entities/notifications.entity';
import { DeviceToken } from './entities/deviceToken.entity';
import { RegisterDeviceTokenDto } from './dto/device-token.dto';
import { PushNotificationService, PushNotificationPayload } from 'src/shared/utils/pushNotification.utils';
import { LoggerService } from 'src/shared/config/loggerService.config';
import { PredictionsService } from '../predictions/predictions.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';

const DEFAULT_REMINDER_HOUR = 9;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    private readonly pushNotificationService: PushNotificationService,
    private readonly predictionsService: PredictionsService,
    private readonly dailyLogsService: DailyLogsAndSymptomsService,
    private readonly logger: LoggerService,
  ) {}

  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto): Promise<void> {
    const existing = await this.deviceTokenRepo.findOne({ where: { token: dto.token } });
    const lastSeenAt = new Date();

    if (existing) {
      await this.deviceTokenRepo.update(existing.id, {
        user: { id: userId },
        platform: dto.platform ?? existing.platform,
        lastSeenAt,
      });
      return;
    }

    await this.deviceTokenRepo.save(
      this.deviceTokenRepo.create({
        user: { id: userId },
        token: dto.token,
        platform: dto.platform ?? null,
        lastSeenAt,
      }),
    );
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    await this.deviceTokenRepo.delete({ token, user: { id: userId } });
  }

  async sendToUser(userId: string, notification: PushNotificationPayload): Promise<void> {
    const deviceTokens = await this.deviceTokenRepo.find({ where: { user: { id: userId } } });

    if (deviceTokens.length === 0) {
      this.logger.info(`No device tokens registered for user ${userId}, skipping push`);
      return;
    }

    const { invalidTokens } = await this.pushNotificationService.sendToTokens(
      deviceTokens.map((d) => d.token),
      notification,
    );

    if (invalidTokens.length > 0) {
      await this.deviceTokenRepo.delete({ token: In(invalidTokens) });
      this.logger.info(`Pruned ${invalidTokens.length} invalid device token(s) for user ${userId}`);
    }
  }

  /**
   * Runs once per hour. Each user's reminder only matches their configured hour once
   * every 24 hours, so a user is notified at most once per day per notification type
   * without needing separate "already sent today" bookkeeping.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourlyNotificationSweep(): Promise<void> {
    try {
      const currentHour = new Date().getUTCHours();
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const settings = await this.notificationRepo
        .createQueryBuilder('n')
        .innerJoinAndSelect('n.user', 'user')
        .where('n.trash = false')
        .andWhere('(n.periodNotification = true OR n.fertilityNotification = true OR n.dailyLogNotification = true)')
        .getMany();

      const dueNow = settings.filter((s) => this.reminderHour(s.reminderTimeInUTC) === currentHour);

      for (const setting of dueNow) {
        await this.evaluateAndNotifyUser(setting, todayStr);
      }
    } catch (error) {
      this.logger.error('Cron: Error running hourly notification sweep', error);
    }
  }

  private reminderHour(reminderTimeInUTC: string | null): number {
    if (!reminderTimeInUTC) return DEFAULT_REMINDER_HOUR;
    const hour = parseInt(reminderTimeInUTC.split(':')[0], 10);
    return Number.isNaN(hour) ? DEFAULT_REMINDER_HOUR : hour;
  }

  private async evaluateAndNotifyUser(setting: Notification, todayStr: string): Promise<void> {
    const userId = setting.user.id;

    const hasTokens = (await this.deviceTokenRepo.count({ where: { user: { id: userId } } })) > 0;
    if (!hasTokens) return;

    const needsPrediction = setting.periodNotification || setting.fertilityNotification;
    const prediction = needsPrediction ? await this.predictionsService.getPredictionForUser(userId) : null;

    if (setting.periodNotification && prediction?.daysUntilNextPeriod === 1) {
      await this.sendToUser(userId, {
        title: 'Period expected tomorrow',
        body: 'Your next period is expected to start tomorrow.',
      });
    }

    if (setting.fertilityNotification && prediction) {
      const isFertileWindowStart = prediction.fertileWindowStart.toDateString() === new Date().toDateString();

      if (prediction.isOvulationDay) {
        await this.sendToUser(userId, {
          title: 'Estimated ovulation day',
          body: 'Today is your estimated ovulation day.',
        });
      } else if (isFertileWindowStart) {
        await this.sendToUser(userId, {
          title: 'Fertile window starting',
          body: 'Your fertile window starts today.',
        });
      }
    }

    if (setting.dailyLogNotification) {
      const todaysLog = await this.dailyLogsService.findDailyLogByDate(todayStr, userId);
      if (!todaysLog) {
        await this.sendToUser(userId, {
          title: 'Daily log reminder',
          body: "Don't forget to log today.",
        });
      }
    }
  }
}
