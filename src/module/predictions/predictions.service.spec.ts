import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsService } from './predictions.service';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';

describe('PredictionsService', () => {
  let service: PredictionsService;
  let periodCyclesService: PeriodCyclesService;
  let dailyLogsService: DailyLogsAndSymptomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionsService,
        {
          provide: PeriodCyclesService,
          useValue: {
            findMostRecentNCycles: jest.fn(),
          },
        },
        {
          provide: DailyLogsAndSymptomsService,
          useValue: {
            getInsightsForCycle: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PredictionsService>(PredictionsService);
    periodCyclesService = module.get<PeriodCyclesService>(PeriodCyclesService);
    dailyLogsService = module.get<DailyLogsAndSymptomsService>(DailyLogsAndSymptomsService);
  });

  it('should return a prediction result', async () => {
    const userId = 'user-1';
    const mockCycles = [
      { startDate: '2024-03-01', cycleLength: 29 },
      { startDate: '2024-02-01', cycleLength: 29 },
    ];
    const mockInsights = {
      avgStress: 2,
      highStressDays: 0,
    };

    (periodCyclesService.findMostRecentNCycles as jest.Mock).mockResolvedValue(mockCycles);
    (dailyLogsService.getInsightsForCycle as jest.Mock).mockResolvedValue(mockInsights);

    const result = await service.getPredictionForUser(userId);

    expect(result).toBeDefined();
    expect(result?.predictedCycleLength).toBeDefined();
    expect(result?.nextPeriodDate).toBeDefined();
  });

  it('should return null if no cycles found', async () => {
    (periodCyclesService.findMostRecentNCycles as jest.Mock).mockResolvedValue([]);
    const result = await service.getPredictionForUser('user-1');
    expect(result).toBeNull();
  });
});
