/**
 * Flora Menstrual Cycle Prediction Algorithm
 *
 * Implements the hybrid statistical approach from the proposal:
 *   1. Weighted Moving Average (WMA)   — recent cycles weighted higher
 *   2. Exponential Smoothing           — smooths short-term fluctuations
 *   3. Outlier Detection               — down-weights abnormal cycles
 *   4. Symptom-Based Adjustment        — adjusts for physiological signals
 *   5. Daily Log Adjustment            — lifestyle/biometric signals from daily logs
 *
 * Handles gracefully:
 *   - No cycle history at all
 *   - Stale cycle history (user didn't log for months/years)
 *   - Partially missing cycle data (null cycleLengths)
 *   - Single cycle only
 *
 * Returns a full PredictionResult that is always anchored to TODAY,
 * never to a stale past date.
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

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

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
  confidence: ConfidenceLevel;
  /**
   * Human-readable note explaining why confidence is reduced.
   * Shown when confidence is 'low' or 'very_low'.
   */
  confidenceNote?: string;
  /** Human-readable list of lifestyle factors currently affecting the prediction */
  activeAdjustments: string[];

  // ── Frontend-friendly cycle status fields ────────────────────────────────────
  /** The inferred start date of the current (active) cycle */
  currentCycleStart: Date;
  /** Day number within the current cycle (1 = first day of period) */
  currentCycleDay: number;
  /** Percentage progress through the current cycle (0–100) */
  cycleProgress: number;
  /** Days remaining until the next predicted period */
  daysUntilNextPeriod: number;
  /**
   * The phase the user is currently in:
   *   'menstrual'  — days 1 to periodLength (default 5)
   *   'follicular' — after menstrual phase, before fertile window
   *   'fertile'    — inside the fertile window
   *   'ovulation'  — on the estimated ovulation day
   *   'luteal'     — after ovulation day, before next period
   */
  currentPhase: 'menstrual' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';
  /** True if today falls within the fertile window (inclusive) */
  isInFertileWindow: boolean;
  /** True if today is estimated to be an ovulation day */
  isOvulationDay: boolean;
  /** True if today is within the menstrual (bleeding) phase */
  isInMenstrualPhase: boolean;
  /**
   * True when the prediction is based on estimated (rolled-forward) cycles
   * because the user's last logged cycle was in the past.
   * The frontend can use this to show a "Log your cycle to improve accuracy" nudge.
   */
  isEstimated: boolean;
  /** How many full cycles were estimated forward from the last logged start date */
  estimatedCyclesForward: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Symptom influence coefficients (kj in the proposal).
 *  Positive = tends to lengthen cycle; negative = tends to shorten. */
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
 * lifestyle factors and menstrual cycle length.
 */
const DAILY_LOG_COEFFICIENTS = {
  stressPerPoint: 0.4,        // per 1-pt above baseline (3), per day of high stress
  sleepDeficitPerHour: 0.3,   // per hour below 7h, per poor-sleep day
  intensiveExercisePerDay: 0.5, // per day of intense exercise this cycle
  eggWhiteMucusPerDay: -0.6,  // negative: egg-white mucus suggests ovulation is near/done
  lowLibidoShift: 0.3,        // if avg libido < 2, may indicate hormonal imbalance
};

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5; // assumed bleed days for phase calculation
const ALPHA = 0.3;              // exponential smoothing factor
const OUTLIER_DOWNWEIGHT = 0.3; // γ — weight reduction for outliers

/** Minimum valid cycle length accepted by the engine */
const MIN_CYCLE_LENGTH = 21;
/** Maximum valid cycle length accepted by the engine */
const MAX_CYCLE_LENGTH = 45;

// ─── Main Engine ─────────────────────────────────────────────────────────────

export class CyclePredictionEngine {
  /**
   * Main entry point: compute a prediction that is always anchored to TODAY.
   *
   * @param cycles      Cycle history, oldest first (engine expects this order).
   *                    Must already be filtered to only include cycles with a positive length.
   * @param symptoms    Optional symptom history for further adjustment.
   * @param lastPeriodStart The start date of the LAST LOGGED period
   *                    (may be many months in the past).
   * @param dailyLogInsights Insights from daily logs of the current/most-recent logged cycle.
   */
  static predict(
    cycles: CycleData[],
    symptoms: SymptomData[],
    lastPeriodStart: Date,
    dailyLogInsights?: DailyLogInsights,
  ): PredictionResult {
    // Guard: no history at all → use safe defaults
    const validLengths = cycles.map((c) => c.length).filter((l) => l >= MIN_CYCLE_LENGTH && l <= MAX_CYCLE_LENGTH);

    if (validLengths.length === 0) {
      return this.defaultPrediction(lastPeriodStart, dailyLogInsights);
    }

    // ── Step 1: Weighted Moving Average ──────────────────────────────────────
    const meanI = mean(validLengths);
    const stdDevI = stdDev(validLengths, meanI);
    const weights = this.computeWeights(validLengths, meanI, stdDevI);
    const lwma = this.weightedMovingAverage(validLengths, weights);

    // ── Step 2: Exponential Smoothing ─────────────────────────────────────────
    const smoothed = this.exponentialSmoothing(validLengths, ALPHA);
    const sn = smoothed[smoothed.length - 1];

    // ── Step 3: Symptom Adjustment ────────────────────────────────────────────
    const sAdj = this.symptomAdjustment(symptoms);

    // ── Step 4: Daily Log Adjustment ─────────────────────────────────────────
    const { dlAdj, activeAdjustments } = dailyLogInsights
      ? this.dailyLogAdjustment(dailyLogInsights)
      : { dlAdj: 0, activeAdjustments: [] };

    // ── Step 5: Final predicted cycle length ──────────────────────────────────
    // β is adjusted based on variability: more variability → rely more on smoothing
    const variability = stdDevI > 0 ? stdDevI / meanI : 0;
    const beta = Math.min(0.8, Math.max(0.2, variability * 2));
    let predicted = beta * sn + (1 - beta) * lwma + sAdj + dlAdj;
    predicted = Math.round(Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, predicted)));

    // ── Roll the anchor forward to find the CURRENT cycle ─────────────────────
    //
    // The last logged period may be many months old. We repeatedly add
    // `predicted` days until the NEXT period would fall strictly in the future.
    // This keeps all dates anchored to present reality regardless of logging gaps.
    const today = this.today();
    const { currentCycleStart, estimatedCyclesForward } = this.rollForward(lastPeriodStart, predicted, today);
    const isEstimated = estimatedCyclesForward > 0;

    // ── Compute ovulation / fertile window anchored to current cycle ──────────
    const formulaOvulationDate = addDays(currentCycleStart, predicted - 14);
    const bbtRaw = dailyLogInsights?.bbtShiftDate ?? null;
    // Only use BBT override when it falls inside the current (rolled-forward) cycle
    const bbtIsCurrentCycle =
      bbtRaw !== null &&
      bbtRaw >= currentCycleStart &&
      bbtRaw <= addDays(currentCycleStart, predicted);
    const ovulationDate = bbtIsCurrentCycle ? bbtRaw! : formulaOvulationDate;
    const bbtConfirmedOvulationDate = bbtIsCurrentCycle ? bbtRaw : null;

    const nextPeriodDate = addDays(currentCycleStart, predicted);
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = addDays(ovulationDate, 1);

    // ── Determine confidence ──────────────────────────────────────────────────
    const { confidence, confidenceNote } = this.computeConfidence(
      validLengths.length,
      estimatedCyclesForward,
      cycles.length, // total cycles including those with missing lengths
    );

    // ── Frontend cycle-status fields ──────────────────────────────────────────
    const frontendFields = this.computeFrontendFields(today, currentCycleStart, predicted, ovulationDate, nextPeriodDate);

    const isIrregular = stdDevI > 8;
    const pregnancyRisk = this.assessPregnancyRisk(currentCycleStart, predicted);

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
      confidenceNote,
      activeAdjustments,
      currentCycleStart,
      isEstimated,
      estimatedCyclesForward,
      ...frontendFields,
    };
  }

  // ─── Roll-forward helper ──────────────────────────────────────────────────────

  /**
   * Advance `anchorDate` by `cycleLength` days until the *next* period
   * (anchorDate + cycleLength) is strictly in the future relative to `today`.
   *
   * Returns the resulting `currentCycleStart` and how many extrapolation steps
   * were taken.
   *
   * Safety: if `cycleLength` ≤ 0 (should never happen after clamping), we use
   * the DEFAULT_CYCLE_LENGTH to avoid an infinite loop.
   */
  private static rollForward(
    anchorDate: Date,
    cycleLength: number,
    today: Date,
  ): { currentCycleStart: Date; estimatedCyclesForward: number } {
    const safeLength = cycleLength > 0 ? cycleLength : DEFAULT_CYCLE_LENGTH;
    let currentCycleStart = new Date(anchorDate);
    currentCycleStart.setHours(0, 0, 0, 0);

    let estimatedCyclesForward = 0;

    // If the anchor is already in the future (e.g., cycle just started today)
    // no roll-forward needed.
    while (addDays(currentCycleStart, safeLength) <= today) {
      currentCycleStart = addDays(currentCycleStart, safeLength);
      estimatedCyclesForward++;
    }

    return { currentCycleStart, estimatedCyclesForward };
  }

  // ─── Confidence Tier ──────────────────────────────────────────────────────────

  /**
   * Compute confidence based on:
   *   1. Number of valid cycle lengths available
   *   2. How many cycles we had to extrapolate forward (staleness proxy)
   *   3. Total cycles logged (some may have missing lengths)
   */
  private static computeConfidence(
    validCount: number,
    estimatedCyclesForward: number,
    totalLogged: number,
  ): { confidence: ConfidenceLevel; confidenceNote?: string } {
    // Base confidence from data quantity
    let confidence: ConfidenceLevel;
    if (validCount >= 6) {
      confidence = 'high';
    } else if (validCount >= 3) {
      confidence = 'medium';
    } else if (validCount >= 1) {
      confidence = 'low';
    } else {
      confidence = 'very_low';
    }

    // Staleness downgrade: each estimated cycle reduces confidence one tier
    // (a gap of >3 cycles is treated as very stale)
    if (estimatedCyclesForward >= 3) {
      confidence = this.downgradeConfidence(confidence, 2);
    } else if (estimatedCyclesForward >= 1) {
      confidence = this.downgradeConfidence(confidence, 1);
    }

    // Build a human-readable note when confidence is degraded
    let confidenceNote: string | undefined;
    if (confidence === 'very_low') {
      if (totalLogged === 0) {
        confidenceNote = 'No cycle history found. Showing a statistical default of 28 days.';
      } else if (estimatedCyclesForward >= 3) {
        confidenceNote = `Your last logged cycle was ${estimatedCyclesForward} cycles ago. Log your current cycle to improve accuracy.`;
      } else {
        confidenceNote = 'Not enough cycle history to make a reliable prediction.';
      }
    } else if (confidence === 'low') {
      if (estimatedCyclesForward >= 1) {
        confidenceNote = `Prediction estimated forward ${estimatedCyclesForward} cycle(s) from your last logged period. Log your period to improve accuracy.`;
      } else {
        confidenceNote = 'Based on limited cycle history (fewer than 3 complete cycles).';
      }
    }

    return { confidence, confidenceNote };
  }

  /** Move confidence down by `tiers` steps (floor is 'very_low'). */
  private static downgradeConfidence(c: ConfidenceLevel, tiers: number): ConfidenceLevel {
    const order: ConfidenceLevel[] = ['very_low', 'low', 'medium', 'high'];
    const idx = order.indexOf(c);
    return order[Math.max(0, idx - tiers)];
  }

  // ─── Frontend fields ──────────────────────────────────────────────────────────

  private static computeFrontendFields(
    today: Date,
    currentCycleStart: Date,
    predicted: number,
    ovulationDate: Date,
    nextPeriodDate: Date,
  ) {
    const msPerDay = 1000 * 60 * 60 * 24;

    // currentCycleDay is 1-indexed; clamp to [1, predicted] for safety
    const rawDayIndex = Math.floor((today.getTime() - currentCycleStart.getTime()) / msPerDay);
    const currentCycleDay = Math.max(1, Math.min(predicted, rawDayIndex + 1));

    const cycleProgress = Math.min(100, Math.round((currentCycleDay / predicted) * 100));
    const daysUntilNextPeriod = Math.max(0, Math.floor((nextPeriodDate.getTime() - today.getTime()) / msPerDay));

    const isInMenstrualPhase = currentCycleDay <= DEFAULT_PERIOD_LENGTH;
    const isOvulationDay = today.getTime() === ovulationDate.getTime();

    // Normalize ovulation/fertile window dates to midnight for correct comparison
    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(fertileStart.getDate() - 5);
    fertileStart.setHours(0, 0, 0, 0);
    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);
    fertileEnd.setHours(0, 0, 0, 0);

    const isInFertileWindow = today >= fertileStart && today <= fertileEnd;

    let currentPhase: PredictionResult['currentPhase'];
    if (isInMenstrualPhase) {
      currentPhase = 'menstrual';
    } else if (isOvulationDay) {
      currentPhase = 'ovulation';
    } else if (isInFertileWindow) {
      currentPhase = 'fertile';
    } else if (today > ovulationDate) {
      currentPhase = 'luteal';
    } else {
      currentPhase = 'follicular';
    }

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

  // ─── Step 1: Weighted Moving Average ─────────────────────────────────────────

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
    return totalWeight === 0 ? DEFAULT_CYCLE_LENGTH : weightedSum / totalWeight;
  }

  // ─── Step 2: Exponential Smoothing ───────────────────────────────────────────

  private static exponentialSmoothing(lengths: number[], alpha: number): number[] {
    const smoothed: number[] = [lengths[0]];
    for (let i = 1; i < lengths.length; i++) {
      smoothed.push(alpha * lengths[i] + (1 - alpha) * smoothed[i - 1]);
    }
    return smoothed;
  }

  // ─── Step 3: Symptom Adjustment ──────────────────────────────────────────────

  private static symptomAdjustment(symptoms: SymptomData[]): number {
    return symptoms.reduce((acc, s) => {
      const k = SYMPTOM_COEFFICIENTS[s.symptomType] ?? 0;
      return acc + k * s.avgSeverity;
    }, 0);
  }

  // ─── Step 4: Daily Log Adjustment ────────────────────────────────────────────

  private static dailyLogAdjustment(insights: DailyLogInsights): {
    dlAdj: number;
    activeAdjustments: string[];
  } {
    let dlAdj = 0;
    const activeAdjustments: string[] = [];

    // ── Stress ──────────────────────────────────────────────────────────────
    if (insights.highStressDays > 0 && insights.avgStress != null) {
      const stressAboveBaseline = Math.max(0, insights.avgStress - 3);
      const stressAdj =
        (stressAboveBaseline * DAILY_LOG_COEFFICIENTS.stressPerPoint * Math.min(insights.highStressDays, 10)) / 10;
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
      const cappedAdj = Math.max(mucusAdj, -2);
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
      activeAdjustments.push(
        `BBT thermal shift detected on ${insights.bbtShiftDate.toDateString()} — ovulation date confirmed`,
      );
    }

    return { dlAdj, activeAdjustments };
  }

  // ─── Pregnancy Risk ───────────────────────────────────────────────────────────

  /**
   * Pregnancy risk: how many days past the expected next period date is "today"?
   * Always uses the rolled-forward currentCycleStart so this is never stale.
   */
  private static assessPregnancyRisk(
    currentCycleStart: Date,
    predictedLength: number,
  ): 'low' | 'medium' | 'high' {
    const today = this.today();
    const expectedNext = addDays(currentCycleStart, predictedLength);
    const daysLate = Math.floor((today.getTime() - expectedNext.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLate >= 15) return 'high';
    if (daysLate >= 5) return 'medium';
    return 'low';
  }

  // ─── Default Prediction (no usable history) ───────────────────────────────────

  /**
   * Used when there is no valid cycle history at all.
   * Uses the population-average cycle length of 28 days.
   * Still rolls forward to today so dates are never stale.
   */
  private static defaultPrediction(lastPeriodStart: Date, dailyLogInsights?: DailyLogInsights): PredictionResult {
    const predicted = DEFAULT_CYCLE_LENGTH;
    const today = this.today();

    const { currentCycleStart, estimatedCyclesForward } = this.rollForward(lastPeriodStart, predicted, today);

    const ovulationDate = addDays(currentCycleStart, predicted - 14);
    const bbtRaw = dailyLogInsights?.bbtShiftDate ?? null;
    const bbtIsCurrentCycle =
      bbtRaw !== null && bbtRaw >= currentCycleStart && bbtRaw <= addDays(currentCycleStart, predicted);
    const effectiveOvulation = bbtIsCurrentCycle ? bbtRaw! : ovulationDate;
    const bbtConfirmedOvulationDate = bbtIsCurrentCycle ? bbtRaw : null;

    const nextPeriodDate = addDays(currentCycleStart, predicted);
    const fertileWindowStart = addDays(effectiveOvulation, -5);
    const fertileWindowEnd = addDays(effectiveOvulation, 1);

    const { confidence, confidenceNote } = this.computeConfidence(0, estimatedCyclesForward, 0);
    const frontendFields = this.computeFrontendFields(today, currentCycleStart, predicted, effectiveOvulation, nextPeriodDate);

    return {
      predictedCycleLength: predicted,
      nextPeriodDate,
      ovulationDate: effectiveOvulation,
      bbtConfirmedOvulationDate,
      fertileWindowStart,
      fertileWindowEnd,
      pregnancyRisk: 'low',
      isIrregular: false,
      confidence,
      confidenceNote,
      activeAdjustments: [],
      currentCycleStart,
      isEstimated: estimatedCyclesForward > 0,
      estimatedCyclesForward,
      ...frontendFields,
    };
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────

  /** Returns today's date at midnight (UTC-normalized for day arithmetic). */
  private static today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
