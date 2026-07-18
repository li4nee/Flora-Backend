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
   * Sends a prediction push to the current user's registered devices on demand,
   * bypassing the reminder-time/settings gating of the hourly cron. Intended for
   * manual testing of the end-to-end FCM path from a button in the app.
   *
   * Uses the user's real prediction data so the notification mirrors what the
   * cron would eventually send.
   */
  async sendTestPredictionNotification(
    userId: string,
  ): Promise<{ sent: boolean; deviceCount: number; message: string }> {
    const deviceTokens = await this.deviceTokenRepo.find({ where: { user: { id: userId } } });

    if (deviceTokens.length === 0) {
      return {
        sent: false,
        deviceCount: 0,
        message: 'No device tokens registered for this user — open the app on a device first.',
      };
    }

    const prediction = await this.predictionsService.getPredictionForUser(userId);
    const days = prediction?.daysUntilNextPeriod;

    let body: string;
    if (days == null) {
      body = 'Your period prediction is being calculated. Keep logging your cycles!';
    } else if (days <= 0) {
      body = 'Your period is expected to start today.';
    } else if (days === 1) {
      body = 'Your next period is expected to start tomorrow.';
    } else {
      body = `Your next period is expected in ${days} days.`;
    }

    await this.sendToUser(userId, {
      title: '🌸 Period Prediction',
      body,
      data: { type: 'prediction', test: 'true' },
    });

    return { sent: true, deviceCount: deviceTokens.length, message: body };
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
