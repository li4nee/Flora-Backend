import { Injectable } from '@nestjs/common';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { mean, stdDev } from 'src/shared/utils/base.utils';

@Injectable()
export class ReportsService {
  constructor(
    private readonly periodCyclesService: PeriodCyclesService,
    private readonly dailyLogsService: DailyLogsAndSymptomsService,
  ) {}

  async getUserReport(userId: string) {
    const cycles = await this.periodCyclesService.findMostRecentNCycles(userId, 12);

    if (cycles.length === 0) {
      return {
        message: 'No cycle data available to generate a report.',
        data: null,
      };
    }

    const cycleLengths = cycles.filter((c) => c.cycleLength != null).map((c) => c.cycleLength!);

    const periodLengths = cycles.filter((c) => c.periodLength != null).map((c) => c.periodLength!);

    const avgCycleLength = cycleLengths.length > 0 ? mean(cycleLengths) : null;
    const avgPeriodLength = periodLengths.length > 0 ? mean(periodLengths) : null;
    const cycleRegularity = cycleLengths.length > 1 ? stdDev(cycleLengths, avgCycleLength!) : 0;

    // Aggregate symptoms across all logs in these cycles
    // Simplified: we'll just get insights for the most recent cycle for now,
    // or we could aggregate over a longer period.
    const lastCycleStart = new Date(cycles[0].startDate);
    const insights = await this.dailyLogsService.getInsightsForCycle(userId, lastCycleStart);

    return {
      summary: {
        avgCycleLength: avgCycleLength ? Math.round(avgCycleLength * 10) / 10 : null,
        avgPeriodLength: avgPeriodLength ? Math.round(avgPeriodLength * 10) / 10 : null,
        cycleRegularity: cycleRegularity ? Math.round(cycleRegularity * 10) / 10 : 0,
        isRegular: cycleRegularity < 5,
      },
      recentTrends: {
        cycleLengths: cycleLengths.slice(0, 6),
        periodLengths: periodLengths.slice(0, 6),
      },
      currentCycleInsights: insights,
    };
  }
}
