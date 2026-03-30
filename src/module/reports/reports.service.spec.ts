import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let periodCyclesService: PeriodCyclesService;
  let dailyLogsService: DailyLogsAndSymptomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
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

    service = module.get<ReportsService>(ReportsService);
    periodCyclesService = module.get<PeriodCyclesService>(PeriodCyclesService);
    dailyLogsService = module.get<DailyLogsAndSymptomsService>(DailyLogsAndSymptomsService);
  });

  it('should return a report summary', async () => {
    const mockCycles = [
      { startDate: '2024-03-01', cycleLength: 29, periodLength: 5 },
      { startDate: '2024-02-01', cycleLength: 29, periodLength: 5 },
    ];
    const mockInsights = {
      avgStress: 2,
    };

    (periodCyclesService.findMostRecentNCycles as jest.Mock).mockResolvedValue(mockCycles);
    (dailyLogsService.getInsightsForCycle as jest.Mock).mockResolvedValue(mockInsights);

    const result = await service.getUserReport('user-1');

    if ('summary' in result && result.summary) {
      expect(result.summary).toBeDefined();
      expect(result.summary.avgCycleLength).toBe(29);
      expect(result.summary.isRegular).toBe(true);
    }
    expect(result.currentCycleInsights).toEqual(mockInsights);
  });
});
