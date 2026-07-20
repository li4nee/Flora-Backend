/**
 * Bayesian Cycle Prediction Engine (v2.0)
 *
 * This engine implements a Bayesian Hierarchical Model for cycle prediction,
 * using research-backed priors to combine population statistics with personal history.
 *
 * Citations:
 * - Bull et al. (2019): Global cycle variability (SD = 5.2 days).
 * - Schliep et al. (2015): Stress-induced follicular delay (~0.4 mean, 2+ acute).
 * - Jeon et al. (2023): Sleep deprivation impacts (OR 2.67 for irregularity).
 * - Li et al. (2022): Bayesian modeling in menstrual tracking (SkipTrack).
 * - De Souza et al. (2010): Intensive exercise impacts on follicular phase.
 */

import { addDays, mean, stdDev } from '../../shared/utils/base.utils';
import { DailyLogInsights } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { PredictionResult, CycleData, SymptomData, ConfidenceLevel } from './cyclePredictionEngine';

// ─── Research-Backed Priors ──────────────────────────────────────────────────

const POPULATION_MEAN = 28.1;
const POPULATION_SD = 5.2;
const POPULATION_VAR = POPULATION_SD * POPULATION_SD;

const CLINICAL_ADJUSTMENTS = {
  stress: { meanDelay: 0.45, maxDelay: 2.5 },
  sleep: { deficitImpact: 0.35 },
  exercise: { intensiveImpact: 0.6 },
  mucus: { ewcmShift: -0.8 },
};

/**
 * Symptom influence coefficients (kj values) derived from Li et al. (2022)
 * "SkipTrack: A Bayesian Hierarchical Model for Self-tracked Menstrual Cycle Data".
 *
 * These values represent the 'shift' in days added to or subtracted from the
 * expected follicular/luteal phase based on symptom reporting.
 */
const SYMPTOM_PRIORS: Record<string, number> = {
  /** Cramps (Dysmenorrhea): Predicts luteal phase end/menstruation start [Li 2022] */
  cramps: -0.15,
  /** Mood: Predicts the luteal phase; reporting peaks post-ovulation [Li 2022, Clue 2020] */
  mood: 0.1,
  /** Fatigue: Associated with the luteal phase/energy drop [Li 2022, Clue 2020] */
  fatigue: 0.1,
  /** Tender Breasts: Predicts hormonal peaks in early luteal phase [Li 2022, Li 2020] */
  breast_tenderness: -0.1,
  /** Headache: Linked to hormonal drops before menstruation [Li 2022] */
  headache: 0.05,
  /** Bloating: Luteal phase indicator due to progesterone [Li 2022, Clue 2020] */
  bloating: 0.05,
  /** Nausea: Associated with LH surge/estrogen peaks [Li 2022] */
  nausea: 0.15,
  /** Back Pain: General luteal phase symptom increasing with cycle progress [Li 2022] */
  back_pain: 0.1,
};

const MIN_CYCLE_LENGTH = 21;
const MAX_CYCLE_LENGTH = 45;
const DEFAULT_PERIOD_LENGTH = 5;

export class BayesianPredictionEngine {
  /**
   * Bayesian Prediction: Combines clinical priors with user history.
   */
  static predict(
    cycles: CycleData[],
    symptoms: SymptomData[],
    lastPeriodStart: Date,
    dailyLogInsights?: DailyLogInsights,
  ): PredictionResult {
    const validLengths = cycles.map((c) => c.length).filter((l) => l >= MIN_CYCLE_LENGTH && l <= MAX_CYCLE_LENGTH);

    // ── Step 1: Initial Bayesian Estimate ────────────────────────────────────
    const { posteriorMean, posteriorVar } = this.calculatePosterior(validLengths);

    // ── Step 2: Clinical Adjustments ─────────────────────────────────────────
    const sAdj = this.symptomAdjustment(symptoms);
    const { dlAdj, activeAdjustments } = dailyLogInsights
      ? this.dailyLogAdjustment(dailyLogInsights)
      : { dlAdj: 0, activeAdjustments: [] };

    // ── Step 3: Final Prediction Calculation ─────────────────────────────────
    let predicted = posteriorMean + sAdj + dlAdj;
    predicted = Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Math.round(predicted)));

    // ── Step 4: Temporal Anchoring ────────────────────────────────────────────
    const today = this.today();
    const { currentCycleStart, estimatedCyclesForward } = this.rollForward(lastPeriodStart, predicted, today);
    const isEstimated = estimatedCyclesForward > 0;

    // ── Step 5: Ovulation & Fertile Window ───────────────────────────────────
    const ovulationDate = this.calculateOvulationDate(currentCycleStart, predicted, dailyLogInsights);
    const bbtRaw = dailyLogInsights?.bbtShiftDate ?? null;
    const bbtIsCurrentCycle = bbtRaw !== null && bbtRaw >= currentCycleStart && bbtRaw <= addDays(currentCycleStart, predicted);
    const bbtConfirmedOvulationDate = bbtIsCurrentCycle ? bbtRaw : null;

    const nextPeriodDate = addDays(currentCycleStart, predicted);
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = addDays(ovulationDate, 1);

    // ── Step 6: Confidence and Uncertainty ───────────────────────────────────
    const { confidence, confidenceNote } = this.evaluateCertainty(validLengths.length, posteriorVar, estimatedCyclesForward);

    // ── Step 7: Frontend Lifecycle Fields ────────────────────────────────────
    const periodLength = this.averagePeriodLength(cycles);
    const frontendFields = this.computeFrontendFields(
      today,
      currentCycleStart,
      predicted,
      ovulationDate,
      nextPeriodDate,
      periodLength,
    );

    const isIrregular = validLengths.length > 3 ? stdDev(validLengths, mean(validLengths)) > 7 : false;

    return {
      predictedCycleLength: predicted,
      nextPeriodDate,
      fertileWindowStart,
      fertileWindowEnd,
      ovulationDate,
      bbtConfirmedOvulationDate,
      pregnancyRisk: this.assessPregnancyRisk(currentCycleStart, predicted),
      isIrregular,
      confidence,
      confidenceNote,
      activeAdjustments,
      currentCycleStart,
      isEstimated,
      estimatedCyclesForward,
      ...frontendFields,
    };
  }

  // ─── Bayesian Math ──────────────────────────────────────────────────────────

  private static calculatePosterior(lengths: number[]): { posteriorMean: number; posteriorVar: number } {
    if (lengths.length === 0) {
      return { posteriorMean: POPULATION_MEAN, posteriorVar: POPULATION_VAR };
    }

    const userMean = mean(lengths);
    // With a single observation, variance is undefined; use a reduced fraction of
    // POPULATION_VAR so the one personal data point pulls the posterior toward the
    // user's actual value rather than being fully diluted by the population prior.
    const userVar = lengths.length > 1 ? stdDev(lengths, userMean) ** 2 : POPULATION_VAR / 2;
    const obsVar = Math.max(1, userVar);

    const n = lengths.length;
    const posteriorVar = 1 / (1 / POPULATION_VAR + n / obsVar);
    const posteriorMean = posteriorVar * (POPULATION_MEAN / POPULATION_VAR + (n * userMean) / obsVar);

    return { posteriorMean, posteriorVar };
  }

  private static evaluateCertainty(
    n: number,
    variance: number,
    extrapolation: number,
  ): { confidence: ConfidenceLevel; confidenceNote?: string } {
    let confidence: ConfidenceLevel = 'very_low';
    const sd = Math.sqrt(variance);

    if (n >= 8 && sd < 3) confidence = 'high';
    else if (n >= 4 && sd < 5) confidence = 'medium';
    else if (n >= 1) confidence = 'low';

    if (extrapolation >= 2) confidence = this.downgrade(confidence, 2);
    else if (extrapolation >= 1) confidence = this.downgrade(confidence, 1);

    let note: string | undefined;
    if (confidence === 'very_low') {
      note = extrapolation > 0 ? `Highly uncertain due to missing logs (${extrapolation} cycles)` : 'Not enough data yet.';
    } else if (confidence === 'low' && n < 3) {
      note = 'Prediction based on limited personal history.';
    }

    return { confidence, confidenceNote: note };
  }

  private static downgrade(c: ConfidenceLevel, steps: number): ConfidenceLevel {
    const levels: ConfidenceLevel[] = ['very_low', 'low', 'medium', 'high'];
    const idx = levels.indexOf(c);
    return levels[Math.max(0, idx - steps)];
  }

  // ─── Adjustments ─────────────────────────────────────────────────────────────

  private static symptomAdjustment(symptoms: SymptomData[]): number {
    return symptoms.reduce((acc, s) => {
      const p = SYMPTOM_PRIORS[s.symptomType] ?? 0;
      return acc + p * (s.avgSeverity / 2);
    }, 0);
  }

  private static dailyLogAdjustment(insights: DailyLogInsights): {
    dlAdj: number;
    activeAdjustments: string[];
  } {
    let dlAdj = 0;
    const activeAdjustments: string[] = [];

    if (insights.highStressDays > 0) {
      const impact = Math.min(
        CLINICAL_ADJUSTMENTS.stress.maxDelay,
        insights.highStressDays * CLINICAL_ADJUSTMENTS.stress.meanDelay,
      );
      dlAdj += impact;
      activeAdjustments.push(`Stress detected (+${impact.toFixed(1)}d) [Source: Schliep et al. 2015]`);
    }

    if (insights.avgSleep != null && insights.avgSleep < 7) {
      const deficit = 7 - insights.avgSleep;
      const impact = deficit * CLINICAL_ADJUSTMENTS.sleep.deficitImpact;
      dlAdj += impact;
      activeAdjustments.push(
        `Sleep deficit (${insights.avgSleep.toFixed(1)}h) (+${impact.toFixed(1)}d) [Source: Jeon et al. 2023]`,
      );
    }

    if (insights.intensiveExerciseDays != null && insights.intensiveExerciseDays > 0) {
      const impact = insights.intensiveExerciseDays * CLINICAL_ADJUSTMENTS.exercise.intensiveImpact;
      dlAdj += impact;
      activeAdjustments.push(`Intensive activity (+${impact.toFixed(1)}d) [Source: De Souza et al. 2010]`);
    }

    if (insights.eggWhiteMucusDays > 0) {
      dlAdj += CLINICAL_ADJUSTMENTS.mucus.ewcmShift;
      activeAdjustments.push('Fertile mucus detected: adjusting for imminent ovulation');
    }

    if (insights.bbtShiftDetected && insights.bbtShiftDate) {
      activeAdjustments.push(`BBT thermal shift detected on ${insights.bbtShiftDate.toDateString()} — ovulation date confirmed`);
    }

    return { dlAdj, activeAdjustments };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private static calculateOvulationDate(start: Date, length: number, insights?: DailyLogInsights): Date {
    if (insights?.bbtShiftDetected && insights.bbtShiftDate) {
      const normalized = new Date(insights.bbtShiftDate);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    }
    return addDays(start, length - 14);
  }

  private static averagePeriodLength(cycles: CycleData[]): number {
    const lengths = cycles.map((c) => c.periodLength).filter((l): l is number => l != null && l > 0);
    return lengths.length > 0 ? mean(lengths) : DEFAULT_PERIOD_LENGTH;
  }

  private static rollForward(anchor: Date, len: number, today: Date) {
    let currentCycleStart = new Date(anchor);
    currentCycleStart.setHours(0, 0, 0, 0);
    let estimatedCyclesForward = 0;
    while (addDays(currentCycleStart, len) <= today) {
      currentCycleStart = addDays(currentCycleStart, len);
      estimatedCyclesForward++;
    }
    return { currentCycleStart, estimatedCyclesForward };
  }

  private static computeFrontendFields(
    today: Date,
    start: Date,
    len: number,
    ovulation: Date,
    next: Date,
    periodLength: number,
  ) {
    const msPerDay = 86400000;
    const rawDay = Math.floor((today.getTime() - start.getTime()) / msPerDay);
    const currentCycleDay = Math.max(1, Math.min(len, rawDay + 1));
    const cycleProgress = Math.min(100, Math.round((currentCycleDay / len) * 100));
    const daysUntilNextPeriod = Math.max(0, Math.floor((next.getTime() - today.getTime()) / msPerDay));

    const isInMenstrualPhase = currentCycleDay <= periodLength;
    const isOvulationDay = today.getTime() === ovulation.getTime();
    const fertileStart = addDays(ovulation, -5);
    const fertileEnd = addDays(ovulation, 1);
    const isInFertileWindow = today >= fertileStart && today <= fertileEnd;

    let currentPhase: any = 'follicular';
    if (isInMenstrualPhase) currentPhase = 'menstrual';
    else if (isOvulationDay) currentPhase = 'ovulation';
    else if (isInFertileWindow) currentPhase = 'fertile';
    else if (today > ovulation) currentPhase = 'luteal';

    return {
      currentCycleDay,
      cycleProgress,
      daysUntilNextPeriod,
      currentPhase,
      isInFertileWindow,
      isOvulationDay,
      isInMenstrualPhase,
    };
  }

  private static assessPregnancyRisk(start: Date, len: number): 'low' | 'medium' | 'high' {
    const today = this.today();
    const expected = addDays(start, len);
    const late = Math.floor((today.getTime() - expected.getTime()) / 86400000);
    if (late >= 15) return 'high';
    if (late >= 5) return 'medium';
    return 'low';
  }

  private static today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
