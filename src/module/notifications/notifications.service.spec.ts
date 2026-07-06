import { In, Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';
import { DeviceToken } from './entities/deviceToken.entity';
import { PushNotificationService } from '../../shared/utils/pushNotification.utils';
import { LoggerService } from '../../shared/config/loggerService.config';
import { PredictionsService } from '../predictions/predictions.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { PredictionResult } from '../predictions/cyclePredictionEngine';

interface MockNotificationRepo {
  createQueryBuilder: jest.Mock;
}
interface MockDeviceTokenRepo {
  count: jest.Mock;
  find: jest.Mock;
  delete: jest.Mock;
}
interface MockPushNotificationService {
  sendToTokens: jest.Mock;
}
interface MockPredictionsService {
  getPredictionForUser: jest.Mock;
}
interface MockDailyLogsService {
  findDailyLogByDate: jest.Mock;
}
interface MockLogger {
  info: jest.Mock;
  error: jest.Mock;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function makeSetting(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    trash: false,
    user: { id: 'user-1' } as Notification['user'],
    periodNotification: false,
    fertilityNotification: false,
    dailyLogNotification: false,
    reminderTimeInUTC: '09:00',
    ...overrides,
  } as Notification;
}

function makePrediction(overrides: Partial<PredictionResult> = {}): PredictionResult {
  const today = todayMidnight();
  return {
    predictedCycleLength: 28,
    nextPeriodDate: addDays(today, 5),
    fertileWindowStart: addDays(today, 10),
    fertileWindowEnd: addDays(today, 16),
    ovulationDate: addDays(today, 14),
    bbtConfirmedOvulationDate: null,
    pregnancyRisk: 'low',
    isIrregular: false,
    confidence: 'medium',
    activeAdjustments: [],
    currentCycleStart: today,
    currentCycleDay: 1,
    cycleProgress: 4,
    daysUntilNextPeriod: 5,
    currentPhase: 'follicular',
    isInFertileWindow: false,
    isOvulationDay: false,
    isInMenstrualPhase: true,
    isEstimated: false,
    estimatedCyclesForward: 0,
    ...overrides,
  };
}

describe('NotificationsService — hourly sweep', () => {
  let notificationRepo: MockNotificationRepo;
  let deviceTokenRepo: MockDeviceTokenRepo;
  let pushNotificationService: MockPushNotificationService;
  let predictionsService: MockPredictionsService;
  let dailyLogsService: MockDailyLogsService;
  let logger: MockLogger;
  let service: NotificationsService;
  let settings: Notification[];

  beforeEach(() => {
    settings = [];
    notificationRepo = {
      createQueryBuilder: jest.fn(() => ({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(settings),
      })),
    };
    deviceTokenRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([{ token: 'device-token-1' }]),
      delete: jest.fn(),
    };
    pushNotificationService = {
      sendToTokens: jest.fn().mockResolvedValue({ invalidTokens: [] }),
    };
    predictionsService = { getPredictionForUser: jest.fn() };
    dailyLogsService = { findDailyLogByDate: jest.fn() };
    logger = { info: jest.fn(), error: jest.fn() };

    // Freeze "now" at the reminder hour used by makeSetting (09:00 UTC).
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 0, 1, 9, 0, 0)));

    service = new NotificationsService(
      notificationRepo as unknown as Repository<Notification>,
      deviceTokenRepo as unknown as Repository<DeviceToken>,
      pushNotificationService as unknown as PushNotificationService,
      predictionsService as unknown as PredictionsService,
      dailyLogsService as unknown as DailyLogsAndSymptomsService,
      logger as unknown as LoggerService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips users whose reminder hour does not match the current UTC hour', async () => {
    settings.push(makeSetting({ periodNotification: true, reminderTimeInUTC: '14:00' }));

    await service.runHourlyNotificationSweep();

    expect(predictionsService.getPredictionForUser).not.toHaveBeenCalled();
    expect(pushNotificationService.sendToTokens).not.toHaveBeenCalled();
  });

  it('skips users with no registered device tokens', async () => {
    deviceTokenRepo.count.mockResolvedValue(0);
    settings.push(makeSetting({ periodNotification: true }));

    await service.runHourlyNotificationSweep();

    expect(predictionsService.getPredictionForUser).not.toHaveBeenCalled();
  });

  it('sends a period reminder when the period is due tomorrow', async () => {
    settings.push(makeSetting({ periodNotification: true }));
    predictionsService.getPredictionForUser.mockResolvedValue(makePrediction({ daysUntilNextPeriod: 1 }));

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).toHaveBeenCalledWith(
      ['device-token-1'],
      expect.objectContaining({ title: 'Period expected tomorrow' }),
    );
  });

  it('does not send a period reminder when the period is not due tomorrow', async () => {
    settings.push(makeSetting({ periodNotification: true }));
    predictionsService.getPredictionForUser.mockResolvedValue(makePrediction({ daysUntilNextPeriod: 5 }));

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).not.toHaveBeenCalled();
  });

  it('sends an ovulation-day notification over a fertile-window-start notification', async () => {
    settings.push(makeSetting({ fertilityNotification: true }));
    predictionsService.getPredictionForUser.mockResolvedValue(
      makePrediction({ isOvulationDay: true, fertileWindowStart: todayMidnight() }),
    );

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).toHaveBeenCalledWith(
      ['device-token-1'],
      expect.objectContaining({ title: 'Estimated ovulation day' }),
    );
  });

  it('sends a fertile-window-start notification on the first day of the window', async () => {
    settings.push(makeSetting({ fertilityNotification: true }));
    predictionsService.getPredictionForUser.mockResolvedValue(
      makePrediction({ isOvulationDay: false, fertileWindowStart: todayMidnight() }),
    );

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).toHaveBeenCalledWith(
      ['device-token-1'],
      expect.objectContaining({ title: 'Fertile window starting' }),
    );
  });

  it('sends a daily log reminder only when no log exists yet for today', async () => {
    settings.push(makeSetting({ dailyLogNotification: true }));
    dailyLogsService.findDailyLogByDate.mockResolvedValue(null);

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).toHaveBeenCalledWith(
      ['device-token-1'],
      expect.objectContaining({ title: 'Daily log reminder' }),
    );
  });

  it('does not send a daily log reminder when today is already logged', async () => {
    settings.push(makeSetting({ dailyLogNotification: true }));
    dailyLogsService.findDailyLogByDate.mockResolvedValue({ id: 'log-1' });

    await service.runHourlyNotificationSweep();

    expect(pushNotificationService.sendToTokens).not.toHaveBeenCalled();
  });

  it('prunes invalid tokens returned by the push provider', async () => {
    settings.push(makeSetting({ dailyLogNotification: true }));
    dailyLogsService.findDailyLogByDate.mockResolvedValue(null);
    pushNotificationService.sendToTokens.mockResolvedValue({ invalidTokens: ['device-token-1'] });

    await service.runHourlyNotificationSweep();

    expect(deviceTokenRepo.delete).toHaveBeenCalledWith({ token: In(['device-token-1']) });
  });
});
