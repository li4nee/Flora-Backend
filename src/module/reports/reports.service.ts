import { Injectable } from '@nestjs/common';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { mean, stdDev } from 'src/shared/utils/base.utils';
import { CycleData, CyclePredictionEngine } from '../predictions/cyclePredictionEngine';

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
        summary: null,
        recentTrends: null,
        currentCycleInsights: null,
        message: 'No cycle data available to generate a report.', // interceptor will pick this up
      };
    }

    const cycleLengths = cycles.filter((c) => c.cycleLength != null).map((c) => c.cycleLength!);
    const periodLengths = cycles.filter((c) => c.periodLength != null).map((c) => c.periodLength!);

    const avgCycleLength = cycleLengths.length > 0 ? mean(cycleLengths) : null;
    const avgPeriodLength = periodLengths.length > 0 ? mean(periodLengths) : null;
    const cycleVariation = cycleLengths.length > 1 ? stdDev(cycleLengths, avgCycleLength!) : 0;

    // Determine regularity status
    let regularityStatus: 'very_regular' | 'regular' | 'irregular' = 'irregular';
    const isRegular = cycleVariation < 8; // In line with prediction engine

    if (cycleLengths.length >= 3) {
      if (cycleVariation < 3) regularityStatus = 'very_regular';
      else if (cycleVariation < 8) regularityStatus = 'regular';
    } else if (cycleLengths.length >= 1) {
      regularityStatus = 'regular';
    }

    // Anchor to CURRENT cycle (rolled forward if needed)
    const formattedCycles: CycleData[] = cycles
      .filter((c) => c.cycleLength != null && c.cycleLength > 0)
      .map((c) => ({
        length: c.cycleLength!,
        startDate: new Date(c.startDate),
      }))
      .slice()
      .reverse();

    const lastPeriod = cycles[0];
    const prediction = CyclePredictionEngine.predict(
      formattedCycles,
      [],
      new Date(lastPeriod.startDate),
    );

    const currentInsights = await this.dailyLogsService.getInsightsForCycle(userId, prediction.currentCycleStart);

    return {
      summary: {
        avgCycleLength: avgCycleLength ? Math.round(avgCycleLength * 10) / 10 : null,
        avgPeriodLength: avgPeriodLength ? Math.round(avgPeriodLength * 10) / 10 : null,
        cycleVariation: Math.round(cycleVariation * 10) / 10,
        regularityStatus,
        isRegular,
        totalCyclesLogged: cycles.length,
        longestCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : null,
        shortestCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : null,
      },
      recentTrends: {
        cycleLengths: cycleLengths.slice(0, 6).reverse(),
        periodLengths: periodLengths.slice(0, 6).reverse(),
        dates: cycles.slice(0, 6).map((c) => c.startDate).reverse(),
      },
      currentCycleInsights: currentInsights,
      dataStatus: {
        isEstimated: prediction.isEstimated,
        lastLoggedDate: lastPeriod.startDate,
        estimatedCyclesForward: prediction.estimatedCyclesForward,
      },
    };
  }
}
