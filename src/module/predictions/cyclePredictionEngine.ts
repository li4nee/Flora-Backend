/**
 * Flora Menstrual Cycle Prediction Algorithm
 *
 * Implements the hybrid statistical approach from the proposal:
 *   1. Weighted Moving Average (WMA)   — recent cycles weighted higher
 *   2. Exponential Smoothing           — smooths short-term fluctuations
 *   3. Outlier Detection               — down-weights abnormal cycles
 *   4. Symptom-Based Adjustment        — adjusts for physiological signals
 *   5. Daily Log Adjustment (NEW)      — lifestyle/biometric signals from daily logs
 *
 * Returns predicted cycle length, next period date, fertility window,
 * pregnancy risk flags, and a BBT-refined ovulation estimate.
 */

import { addDays, mean, stdDev } from 'src/shared/utils/base.utils';
import { DailyLogInsights } from '../daily-logs-symptoms/daily-logs-symptoms.service';

export interface CycleData {
  length: number; // cycle length in days (must be > 0)
  startDate: Date;
}

export interface SymptomData {
  symptomType: string;
  avgSeverity: number; // 1-5 scale
}

export interface PredictionResult {
  predictedCycleLength: number;
  nextPeriodDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  ovulationDate: Date;
  /** If BBT data confirmed ovulation on a specific day, this is used instead of the formula estimate */
  bbtConfirmedOvulationDate: Date | null;
  pregnancyRisk: 'low' | 'medium' | 'high';
  isIrregular: boolean;
  irregularityNote?: string;
  confidence: 'low' | 'medium' | 'high';
  /** Human-readable list of lifestyle factors currently affecting the prediction */
  activeAdjustments: string[];
}

// Symptom influence coefficients (kj in the proposal)
// Positive = tends to lengthen cycle; negative = tends to shorten
const SYMPTOM_COEFFICIENTS: Record<string, number> = {
  cramps: -0.2,
  mood: 0.1,
  fatigue: 0.15,
  headache: 0.1,
  bloating: 0.05,
  breast_tenderness: -0.1,
  nausea: 0.2,
  back_pain: 0.1,
  acne: 0.05,
  flow: -0.15,
};

/**
 * Daily log influence coefficients — derived from published research on
 * lifestyle factors and menstrual cycle length:
 *
 * - Stress: High cortisol suppresses GnRH → delayed ovulation → longer cycle
 * - Sleep deprivation: Disrupts LH surge → +1–3 day shift
 * - Intense exercise: Hypothalamic suppression of GnRH in overtraining → lengthens cycle
 * - Egg-white mucus days: Signals ovulation is imminent → cycle may be shorter than predicted
 * - Libido peak: Estrogen-driven, correlates with ovulation window → refine timing
 */
const DAILY_LOG_COEFFICIENTS = {
  stressPerPoint: 0.4, // per 1-pt above baseline (3), per day of high stress
  sleepDeficitPerHour: 0.3, // per hour below 7h, per poor-sleep day
  intensiveExercisePerDay: 0.5, // per day of intense exercise this cycle
  eggWhiteMucusPerDay: -0.6, // negative: egg-white mucus suggests ovulation is near/done
  lowLibidoShift: 0.3, // if avg libido < 2, may indicate hormonal imbalance
};

const DEFAULT_CYCLE_LENGTH = 28;
const ALPHA = 0.3; // exponential smoothing factor
const OUTLIER_DOWNWEIGHT = 0.3; // γ — weight reduction for outliers

export class CyclePredictionEngine {
  /**
   * Main entry point: compute prediction from historical cycles + symptoms + daily logs.
   */
  static predict(
    cycles: CycleData[],
    symptoms: SymptomData[],
    lastPeriodStart: Date,
    dailyLogInsights?: DailyLogInsights,
  ): PredictionResult {
    if (cycles.length === 0) {
      return this.defaultPrediction(lastPeriodStart, dailyLogInsights);
    }

    const lengths = cycles.map((c) => c.length).filter((l) => l > 0);

    const meanI = mean(lengths);
    const stdDevI = stdDev(lengths, meanI);

    // Step 1: Weighted Moving Average
    const weights = this.computeWeights(lengths, meanI, stdDevI);
    const lwma = this.weightedMovingAverage(lengths, weights);

    // Step 2: Exponential Smoothing
    const smoothed = this.exponentialSmoothing(lengths, ALPHA);
    const sn = smoothed[smoothed.length - 1];

    // Step 3: Symptom Adjustment
    const sAdj = this.symptomAdjustment(symptoms);

    // Step 4: Daily Log Adjustment (NEW)
    const { dlAdj, activeAdjustments } = dailyLogInsights
      ? this.dailyLogAdjustment(dailyLogInsights)
      : { dlAdj: 0, activeAdjustments: [] };

    // Step 5: Final prediction
    // L = β × Sn + (1 - β) × LWMA + SAdj + DLAdj
    // β is adjusted based on variability: more variable → rely more on smoothing
    const variability = stdDevI / meanI;
    const beta = Math.min(0.8, Math.max(0.2, variability * 2));

    let predicted = beta * sn + (1 - beta) * lwma + sAdj + dlAdj;
    predicted = Math.round(Math.max(21, Math.min(45, predicted)));

    // Ovulation estimate: default formula (cycle - 14)
    // But override with BBT-confirmed date if available
    const formulaOvulationDate = addDays(lastPeriodStart, predicted - 14);
    const bbtConfirmedOvulationDate = dailyLogInsights?.bbtShiftDate ?? null;
    const ovulationDate = bbtConfirmedOvulationDate ?? formulaOvulationDate;

    const nextPeriodDate = addDays(ovulationDate, 14); // luteal phase is ~fixed 14 days
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = addDays(ovulationDate, 1);

    const isIrregular = stdDevI > 8;
    const pregnancyRisk = this.assessPregnancyRisk(lastPeriodStart, predicted);
    const confidence = lengths.length >= 6 ? 'high' : lengths.length >= 3 ? 'medium' : 'low';

    return {
      predictedCycleLength: predicted,
      nextPeriodDate,
      fertileWindowStart,
      fertileWindowEnd,
      ovulationDate,
      bbtConfirmedOvulationDate,
      pregnancyRisk,
      isIrregular,
      irregularityNote: isIrregular
        ? 'Your cycle shows significant variation. Consider consulting a healthcare provider.'
        : undefined,
      confidence,
      activeAdjustments,
    };
  }

  // ─── Step 1: Weighted Moving Average ─────────────────────────────────────────

  /**
   * Compute weights: recent cycles get higher weight; outliers get down-weighted.
   * wi = i (linear recency weight) × outlier_factor
   */
  private static computeWeights(lengths: number[], mean: number, stdDev: number): number[] {
    return lengths.map((l, i) => {
      const recencyWeight = i + 1; // index 0 = oldest, last = most recent
      const isOutlier = stdDev > 0 && Math.abs(l - mean) > 2 * stdDev;
      return isOutlier ? recencyWeight * OUTLIER_DOWNWEIGHT : recencyWeight;
    });
  }

  private static weightedMovingAverage(lengths: number[], weights: number[]): number {
    const weightedSum = lengths.reduce((acc, l, i) => acc + weights[i] * l, 0);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return weightedSum / totalWeight;
  }

  // ─── Step 2: Exponential Smoothing ───────────────────────────────────────────

  /**
   * Si = α × Li + (1 - α) × Si-1
   * Initial S0 = L0 (first value)
   */
  private static exponentialSmoothing(lengths: number[], alpha: number): number[] {
    const smoothed: number[] = [lengths[0]];
    for (let i = 1; i < lengths.length; i++) {
      smoothed.push(alpha * lengths[i] + (1 - alpha) * smoothed[i - 1]);
    }
    return smoothed;
  }

  // ─── Step 4: Symptom Adjustment ──────────────────────────────────────────────

  /**
   * SAdj = Σ (kj × sj) for all tracked symptoms
   */
  private static symptomAdjustment(symptoms: SymptomData[]): number {
    return symptoms.reduce((acc, s) => {
      const k = SYMPTOM_COEFFICIENTS[s.symptomType] ?? 0;
      return acc + k * s.avgSeverity;
    }, 0);
  }

  // ─── Step 5: Daily Log Adjustment ────────────────────────────────────────────

  /**
   * Translate aggregated daily log insights into a cycle-length adjustment.
   *
   * Each factor is documented with its physiological rationale:
   *
   *   Stress: Cortisol suppresses GnRH pulsatility → delayed LH surge → delayed
   *           ovulation → longer follicular phase → longer cycle.
   *
   *   Egg-white mucus: Indicates fertile window was active. More egg-white days in
   *           this cycle → ovulation likely occurred on schedule or early → slight
   *           negative adjustment (cycle may be shorter than predicted).
   *
   *   Low libido: Chronic low libido can indicate low estrogen/thyroid issues,
   *           which often correspond with longer cycles.
   */
  private static dailyLogAdjustment(insights: DailyLogInsights): {
    dlAdj: number;
    activeAdjustments: string[];
  } {
    let dlAdj = 0;
    const activeAdjustments: string[] = [];

    // ── Stress ──────────────────────────────────────────────────────────────
    if (insights.highStressDays > 0 && insights.avgStress != null) {
      const stressAboveBaseline = Math.max(0, insights.avgStress - 3); // baseline = 3
      const stressAdj =
        (stressAboveBaseline * DAILY_LOG_COEFFICIENTS.stressPerPoint * Math.min(insights.highStressDays, 10)) / 10; // cap contribution at 10 days
      dlAdj += stressAdj;
      if (stressAdj > 0.1) {
        activeAdjustments.push(
          `High stress (${insights.highStressDays} days) may delay ovulation (+${stressAdj.toFixed(1)} days)`,
        );
      }
    }

    // ── Egg-White Cervical Mucus ─────────────────────────────────────────────
    if (insights.eggWhiteMucusDays > 0) {
      const mucusAdj = insights.eggWhiteMucusDays * DAILY_LOG_COEFFICIENTS.eggWhiteMucusPerDay;
      const cappedAdj = Math.max(mucusAdj, -2); // cap at -2 days
      dlAdj += cappedAdj;
      activeAdjustments.push(
        `Egg-white mucus observed (${insights.eggWhiteMucusDays} days) → ovulation likely on track (${cappedAdj.toFixed(1)} days)`,
      );
    }

    // ── Low Libido ───────────────────────────────────────────────────────────
    if (insights.avgLibido != null && insights.avgLibido < 2) {
      dlAdj += DAILY_LOG_COEFFICIENTS.lowLibidoShift;
      activeAdjustments.push(
        `Consistently low libido may indicate hormonal imbalance (+${DAILY_LOG_COEFFICIENTS.lowLibidoShift} days)`,
      );
    }

    // ── BBT Shift Note ───────────────────────────────────────────────────────
    if (insights.bbtShiftDetected && insights.bbtShiftDate) {
      activeAdjustments.push(`BBT thermal shift detected on ${insights.bbtShiftDate.toDateString()} — ovulation date confirmed`);
    }

    return { dlAdj, activeAdjustments };
  }

  // ─── Fertility & Pregnancy Risk ───────────────────────────────────────────────

  /**
   * Pregnancy risk: based on how overdue the period is.
   * - Low: period not yet late (or less than 5 days late)
   * - Medium: 5-14 days late
   * - High: 15+ days late (missed period)
   */
  private static assessPregnancyRisk(lastPeriodStart: Date, predictedLength: number): 'low' | 'medium' | 'high' {
    const today = new Date();
    const expectedNext = addDays(lastPeriodStart, predictedLength);
    const daysLate = Math.floor((today.getTime() - expectedNext.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLate >= 15) return 'high';
    if (daysLate >= 5) return 'medium';
    return 'low';
  }

  // Default prediction for the user , usually for the 1st cycle with no history.
  // Uses the default cycle length i.e 28 days and adjusts ovulation date based on BBT if available.
  private static defaultPrediction(lastPeriodStart: Date, dailyLogInsights?: DailyLogInsights): PredictionResult {
    const predicted = DEFAULT_CYCLE_LENGTH;
    const ovulationDate = addDays(lastPeriodStart, predicted - 14);
    const bbtConfirmedOvulationDate = dailyLogInsights?.bbtShiftDate ?? null;
    const effectiveOvulation = bbtConfirmedOvulationDate ?? ovulationDate;
    return {
      predictedCycleLength: predicted,
      nextPeriodDate: addDays(effectiveOvulation, 14),
      ovulationDate: effectiveOvulation,
      bbtConfirmedOvulationDate,
      fertileWindowStart: addDays(effectiveOvulation, -5),
      fertileWindowEnd: addDays(effectiveOvulation, 1),
      pregnancyRisk: 'low',
      isIrregular: false,
      confidence: 'low',
      activeAdjustments: [],
    };
  }
}
