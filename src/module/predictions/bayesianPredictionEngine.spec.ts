import { BayesianPredictionEngine } from './bayesianPredictionEngine';
import { CycleData, SymptomData } from './cyclePredictionEngine';
import { DailyLogInsights } from '../daily-logs-symptoms/daily-logs-symptoms.service';

describe('BayesianPredictionEngine', () => {
  const lastPeriodStart = new Date('2026-05-01');

  describe('calculatePosterior', () => {
    it('should return population average when no history is provided', () => {
      const result = BayesianPredictionEngine.predict([], [], lastPeriodStart);
      expect(result.predictedCycleLength).toBe(28);
      expect(result.confidence).toBe('very_low');
    });

    it('should converge towards user history as more cycles are added', () => {
      const cycles: CycleData[] = [
        { length: 32, startDate: new Date('2026-01-01') },
        { length: 32, startDate: new Date('2026-02-02') },
        { length: 32, startDate: new Date('2026-03-06') },
      ];
      const result = BayesianPredictionEngine.predict(cycles, [], lastPeriodStart);
      expect(result.predictedCycleLength).toBeGreaterThan(29);
      expect(result.predictedCycleLength).toBeLessThanOrEqual(32);
    });
  });

  describe('Clinical Adjustments', () => {
    it('should delay prediction based on high stress', () => {
      const insights: DailyLogInsights = {
        highStressDays: 5,
        avgStress: 4,
        avgEnergy: null,
        avgMood: null,
        avgBBT: null,
        avgLibido: null,
        avgSleep: null,
        eggWhiteMucusDays: 0,
        intensiveExerciseDays: 0,
        totalMedicationDays: 0,
        contraceptiveConsistency: 0,
        bbtShiftDetected: false,
        bbtShiftDate: null,
        topSymptoms: [],
      };
      const result = BayesianPredictionEngine.predict([], [], lastPeriodStart, insights);
      expect(result.predictedCycleLength).toBeGreaterThan(28);
      expect(result.activeAdjustments.some(a => a.includes('Stress detected'))).toBe(true);
    });
  });
});
