import { Injectable } from '@nestjs/common';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { CyclePredictionEngine, CycleData } from './cyclePredictionEngine';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly periodCyclesService: PeriodCyclesService,
    private readonly dailyLogsService: DailyLogsAndSymptomsService,
  ) {}

  async getPredictionForUser(userId: string) {
    // Fetch historical cycles (at least 6 for high confidence)
    const cycles = await this.periodCyclesService.findMostRecentNCycles(userId, 12);

    // Format cycles for the engine
    const formattedCycles: CycleData[] = cycles
      .filter((c) => c.cycleLength != null)
      .map((c) => ({
        length: c.cycleLength!,
        startDate: new Date(c.startDate),
      }));

    // Get the most recent period start date
    const lastPeriod = cycles.length > 0 ? cycles[0] : null;
    if (!lastPeriod) {
      return null;
    }

    // Fetch daily log insights for the current/most recent cycle
    const insights = await this.dailyLogsService.getInsightsForCycle(userId, new Date(lastPeriod.startDate));

    // Run the prediction engine
    // We can also keep symptoms here but for now this is enough
    const result = CyclePredictionEngine.predict(
      formattedCycles.reverse(), // Engine expects oldest to newest
      [],
      new Date(lastPeriod.startDate),
      insights,
    );

    return result;
  }
}
