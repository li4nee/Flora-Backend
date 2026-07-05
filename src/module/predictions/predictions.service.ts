import { Injectable } from '@nestjs/common';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { BayesianPredictionEngine } from './bayesianPredictionEngine';
import { CycleData } from './cyclePredictionEngine';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly periodCyclesService: PeriodCyclesService,
    private readonly dailyLogsService: DailyLogsAndSymptomsService,
  ) {}

  async getPredictionForUser(userId: string) {
    // Fetch historical cycles sorted newest-first (DB order: DESC by startDate)
    const cycles = await this.periodCyclesService.findMostRecentNCycles(userId, 12);

    if (cycles.length === 0) {
      // No cycles at all → engine will use a safe 28-day default
      return BayesianPredictionEngine.predict(
        [],
        [],
        new Date(), // anchor to today — the engine will use DEFAULT_CYCLE_LENGTH
        undefined,
      );
    }

    // The most recent recorded cycle is cycles[0] (DESC order from DB).
    const lastPeriod = cycles[0];

    // Build filtered cycle-length list for the engine.
    // Only include cycles with a valid cycleLength to keep arithmetic sensible.
    // Use .slice() before .reverse() so we do NOT mutate the `cycles` array
    // (which would corrupt the `lastPeriod` reference above).
    const formattedCycles: CycleData[] = cycles
      .filter((c) => c.cycleLength != null && c.cycleLength > 0)
      .map((c) => ({
        length: c.cycleLength!,
        startDate: new Date(c.startDate),
      }))
      .slice() // defensive copy before reversing
      .reverse(); // engine expects oldest → newest

    // Fetch daily log insights anchored to the last LOGGED period start.
    const insights = await this.dailyLogsService.getInsightsForCycle(userId, new Date(lastPeriod.startDate));

    return BayesianPredictionEngine.predict(formattedCycles, insights.topSymptoms, new Date(lastPeriod.startDate), insights);
  }
}
