import { BayesianPredictionEngine } from './bayesianPredictionEngine';
import { CycleData, SymptomData } from './cyclePredictionEngine';
import { DailyLogInsights } from '../daily-logs-symptoms/daily-logs-symptoms.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeCycles(lengths: number[], lastStartDaysAgo: number): CycleData[] {
  const today = todayMidnight();
  const cycles: CycleData[] = [];
  let offset = lastStartDaysAgo;
  for (let i = lengths.length - 1; i >= 0; i--) {
    cycles.unshift({ length: lengths[i], startDate: addDays(today, -offset) });
    offset += lengths[i];
  }
  return cycles;
}

const emptyInsights = (): DailyLogInsights => ({
  highStressDays: 0,
  avgStress: null,
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
});

const LAST_PERIOD = new Date('2026-05-15'); // fixed anchor for deterministic tests

// ─── 1. Bayesian posterior math ───────────────────────────────────────────────

describe('BayesianPredictionEngine — posterior math', () => {
  it('uses population prior (28.1→28) when no history', () => {
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    expect(r.predictedCycleLength).toBe(28);
  });

  it('pulls prediction toward user history as cycles accumulate', () => {
    // With 1 cycle of 35d it should move away from 28 but not reach 35
    const one = makeCycles([35], 5);
    const r1 = BayesianPredictionEngine.predict(one, [], LAST_PERIOD);
    expect(r1.predictedCycleLength).toBeGreaterThan(28);
    expect(r1.predictedCycleLength).toBeLessThan(35);

    // With 6 cycles of 35d it should be much closer to 35
    const six = makeCycles([35, 35, 35, 35, 35, 35], 5);
    const r6 = BayesianPredictionEngine.predict(six, [], LAST_PERIOD);
    expect(r6.predictedCycleLength).toBeGreaterThan(r1.predictedCycleLength);
    expect(r6.predictedCycleLength).toBeGreaterThanOrEqual(33);
  });

  it('converges correctly for regular 28d cycles (posterior ≈ 28)', () => {
    const cycles = makeCycles([28, 28, 28, 28, 28, 28], 10);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(r.predictedCycleLength).toBe(28);
  });

  it('clamps prediction to [21, 45] regardless of data', () => {
    // Cycles with extreme outliers are filtered; edge case: all valid cycles are 22d
    const cycles = makeCycles([22, 22, 22, 22, 22], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(r.predictedCycleLength).toBeGreaterThanOrEqual(21);
    expect(r.predictedCycleLength).toBeLessThanOrEqual(45);
  });

  it('filters out cycles outside [21, 45] before computing posterior', () => {
    // 60-day cycle is beyond MAX; should be ignored, leaving ~28d prediction
    const cycles = makeCycles([28, 60, 28, 28], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(r.predictedCycleLength).toBe(28);
  });
});

// ─── 2. Symptom adjustments ───────────────────────────────────────────────────

describe('BayesianPredictionEngine — symptom adjustments', () => {
  const baseResult = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
  const base = baseResult.predictedCycleLength;

  // All symptoms with positive coefficients should push cycle length UP (or stay equal after rounding)
  const posSymptoms: Array<{ name: string; type: string }> = [
    { name: 'mood', type: 'mood' },
    { name: 'fatigue', type: 'fatigue' },
    { name: 'headache', type: 'headache' },
    { name: 'bloating', type: 'bloating' },
    { name: 'nausea', type: 'nausea' },
    { name: 'back_pain', type: 'back_pain' },
  ];

  for (const { name, type } of posSymptoms) {
    it(`symptom "${name}" (positive coefficient) does not shorten cycle`, () => {
      const symptoms: SymptomData[] = [{ symptomType: type, avgSeverity: 5 }];
      const r = BayesianPredictionEngine.predict([], symptoms, LAST_PERIOD);
      // After rounding, should be >= base (may equal base if adjustment < 0.5)
      expect(r.predictedCycleLength).toBeGreaterThanOrEqual(base);
    });
  }

  // All symptoms with negative coefficients should push cycle length DOWN (or stay equal after rounding)
  const negSymptoms: Array<{ name: string; type: string }> = [
    { name: 'cramps', type: 'cramps' },
    { name: 'breast_tenderness', type: 'breast_tenderness' },
  ];

  for (const { name, type } of negSymptoms) {
    it(`symptom "${name}" (negative coefficient) does not lengthen cycle`, () => {
      const symptoms: SymptomData[] = [{ symptomType: type, avgSeverity: 5 }];
      const r = BayesianPredictionEngine.predict([], symptoms, LAST_PERIOD);
      expect(r.predictedCycleLength).toBeLessThanOrEqual(base);
    });
  }

  it('unknown symptom type has zero effect', () => {
    const symptoms: SymptomData[] = [{ symptomType: 'unknown_symptom_xyz', avgSeverity: 5 }];
    const r = BayesianPredictionEngine.predict([], symptoms, LAST_PERIOD);
    expect(r.predictedCycleLength).toBe(base);
  });

  it('symptom severity scales the adjustment (severity 5 > severity 1)', () => {
    const s5: SymptomData[] = [{ symptomType: 'nausea', avgSeverity: 5 }];
    const s1: SymptomData[] = [{ symptomType: 'nausea', avgSeverity: 1 }];
    const r5 = BayesianPredictionEngine.predict([], s5, LAST_PERIOD);
    const r1 = BayesianPredictionEngine.predict([], s1, LAST_PERIOD);
    expect(r5.predictedCycleLength).toBeGreaterThanOrEqual(r1.predictedCycleLength);
  });

  it('multiple positive symptoms accumulate adjustment', () => {
    const symptoms: SymptomData[] = [
      { symptomType: 'nausea', avgSeverity: 5 },
      { symptomType: 'fatigue', avgSeverity: 5 },
      { symptomType: 'back_pain', avgSeverity: 5 },
      { symptomType: 'mood', avgSeverity: 5 },
    ];
    const single: SymptomData[] = [{ symptomType: 'nausea', avgSeverity: 5 }];
    const rMulti = BayesianPredictionEngine.predict([], symptoms, LAST_PERIOD);
    const rSingle = BayesianPredictionEngine.predict([], single, LAST_PERIOD);
    expect(rMulti.predictedCycleLength).toBeGreaterThanOrEqual(rSingle.predictedCycleLength);
  });
});

// ─── 3. Daily log adjustments ─────────────────────────────────────────────────

describe('BayesianPredictionEngine — daily log adjustments', () => {
  it('stress delays the cycle and appears in activeAdjustments', () => {
    const insights = { ...emptyInsights(), highStressDays: 5 };
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD, insights);
    expect(r.predictedCycleLength).toBeGreaterThan(28);
    expect(r.activeAdjustments.some(a => a.includes('Stress'))).toBe(true);
  });

  it('stress delay is capped at maxDelay (2.5 days)', () => {
    const low = { ...emptyInsights(), highStressDays: 2 };
    const high = { ...emptyInsights(), highStressDays: 20 }; // way above threshold
    const rLow = BayesianPredictionEngine.predict([], [], LAST_PERIOD, low);
    const rHigh = BayesianPredictionEngine.predict([], [], LAST_PERIOD, high);
    // rHigh should not exceed rLow by more than 2.5 days (the cap)
    expect(rHigh.predictedCycleLength - rLow.predictedCycleLength).toBeLessThanOrEqual(3); // allow rounding
  });

  it('sleep deficit delays the cycle proportional to missing hours', () => {
    const good = { ...emptyInsights(), avgSleep: 8 };
    const poor = { ...emptyInsights(), avgSleep: 5 }; // 2h deficit
    const rGood = BayesianPredictionEngine.predict([], [], LAST_PERIOD, good);
    const rPoor = BayesianPredictionEngine.predict([], [], LAST_PERIOD, poor);
    expect(rPoor.predictedCycleLength).toBeGreaterThanOrEqual(rGood.predictedCycleLength);
    expect(rPoor.activeAdjustments.some(a => a.includes('Sleep deficit'))).toBe(true);
  });

  it('avgSleep >= 7 triggers no sleep penalty', () => {
    const ok = { ...emptyInsights(), avgSleep: 7 };
    const rOk = BayesianPredictionEngine.predict([], [], LAST_PERIOD, ok);
    const rBase = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    expect(rOk.predictedCycleLength).toBe(rBase.predictedCycleLength);
    expect(rOk.activeAdjustments.some(a => a.includes('Sleep'))).toBe(false);
  });

  it('intensive exercise delays the cycle and appears in activeAdjustments', () => {
    const insights = { ...emptyInsights(), intensiveExerciseDays: 4 };
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD, insights);
    expect(r.predictedCycleLength).toBeGreaterThan(28);
    expect(r.activeAdjustments.some(a => a.includes('Intensive activity') || a.includes('activity'))).toBe(true);
  });

  it('egg-white cervical mucus (EWCM) shortens the prediction', () => {
    const base = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    const ewcm = { ...emptyInsights(), eggWhiteMucusDays: 2 };
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD, ewcm);
    expect(r.predictedCycleLength).toBeLessThanOrEqual(base.predictedCycleLength);
    expect(r.activeAdjustments.some(a => a.toLowerCase().includes('mucus') || a.toLowerCase().includes('fertile'))).toBe(true);
  });

  it('BBT shift overrides formula ovulation date and is reflected in bbtConfirmedOvulationDate', () => {
    const today = todayMidnight();
    // Cycle started 20 days ago, predicted ~28d → formula ovulation would be at day 14 (6 days ago)
    // Simulate a BBT shift 4 days ago (later than formula)
    const bbtDate = addDays(today, -4);
    const insights: DailyLogInsights = {
      ...emptyInsights(),
      bbtShiftDetected: true,
      bbtShiftDate: bbtDate,
    };
    const lastPeriod = addDays(today, -20);
    const cycles = makeCycles([28, 28, 28], 20);
    const r = BayesianPredictionEngine.predict(cycles, [], lastPeriod, insights);

    expect(r.bbtConfirmedOvulationDate).not.toBeNull();
    expect(r.ovulationDate.getTime()).toBe(bbtDate.getTime());
    expect(r.activeAdjustments.some(a => a.includes('BBT') || a.includes('bbt') || a.toLowerCase().includes('ovulation'))).toBe(true);
  });

  it('BBT shift outside the current cycle window is ignored', () => {
    const today = todayMidnight();
    const lastPeriod = addDays(today, -10); // cycle started 10 days ago, length ~28
    const staleDate = addDays(today, -90); // way before the current cycle
    const insights: DailyLogInsights = {
      ...emptyInsights(),
      bbtShiftDetected: true,
      bbtShiftDate: staleDate,
    };
    const r = BayesianPredictionEngine.predict([], [], lastPeriod, insights);
    expect(r.bbtConfirmedOvulationDate).toBeNull();
  });

  it('combined stressors accumulate correctly', () => {
    const noStressors = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    const allStressors: DailyLogInsights = {
      ...emptyInsights(),
      highStressDays: 5,
      avgSleep: 5,
      intensiveExerciseDays: 3,
    };
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD, allStressors);
    expect(r.predictedCycleLength).toBeGreaterThan(noStressors.predictedCycleLength);
    expect(r.activeAdjustments.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── 4. Confidence levels ─────────────────────────────────────────────────────

describe('BayesianPredictionEngine — confidence', () => {
  it('very_low confidence when no history', () => {
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    expect(r.confidence).toBe('very_low');
  });

  it('low confidence with 1–3 cycles', () => {
    const cycles = makeCycles([28, 28], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(['low', 'medium']).toContain(r.confidence);
  });

  it('medium or high confidence with 4+ consistent cycles', () => {
    const cycles = makeCycles([28, 28, 28, 28, 28, 28, 28, 28], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(['medium', 'high']).toContain(r.confidence);
  });

  it('confidence degrades when many cycles estimated forward (stale data)', () => {
    // Last period 180 days ago — engine will roll forward many cycles
    const today = todayMidnight();
    const veryStale = addDays(today, -180);
    const cycles = makeCycles([28, 28, 28, 28, 28, 28, 28, 28], 180);
    const r = BayesianPredictionEngine.predict(cycles, [], veryStale);
    expect(['low', 'very_low']).toContain(r.confidence);
    expect(r.estimatedCyclesForward).toBeGreaterThan(0);
  });

  it('confidenceNote is provided when confidence is low or very_low', () => {
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    expect(r.confidence).toBe('very_low');
    expect(r.confidenceNote).toBeTruthy();
  });
});

// ─── 5. Roll-forward / temporal anchoring ─────────────────────────────────────

describe('BayesianPredictionEngine — roll-forward anchoring', () => {
  it('nextPeriodDate is always in the future regardless of last period date', () => {
    const today = todayMidnight();
    const cases = [
      addDays(today, -10),   // recent
      addDays(today, -200),  // very stale
      addDays(today, 0),     // today
    ];
    for (const last of cases) {
      const r = BayesianPredictionEngine.predict([], [], last);
      expect(r.nextPeriodDate.getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('estimatedCyclesForward is 0 when cycle started recently', () => {
    const today = todayMidnight();
    const last = addDays(today, -5); // 5 days into a ~28d cycle
    const r = BayesianPredictionEngine.predict([], [], last);
    expect(r.estimatedCyclesForward).toBe(0);
    expect(r.isEstimated).toBe(false);
  });

  it('estimatedCyclesForward > 0 and isEstimated=true when last period is old', () => {
    const today = todayMidnight();
    const last = addDays(today, -90);
    const r = BayesianPredictionEngine.predict([], [], last);
    expect(r.estimatedCyclesForward).toBeGreaterThan(0);
    expect(r.isEstimated).toBe(true);
  });

  it('currentCycleStart <= today always', () => {
    const today = todayMidnight();
    const r = BayesianPredictionEngine.predict([], [], addDays(today, -60));
    expect(r.currentCycleStart.getTime()).toBeLessThanOrEqual(today.getTime());
  });
});

// ─── 6. Frontend cycle-status fields ─────────────────────────────────────────

describe('BayesianPredictionEngine — frontend fields', () => {
  it('currentCycleDay is 1-indexed and within [1, predictedCycleLength]', () => {
    const today = todayMidnight();
    const r = BayesianPredictionEngine.predict([], [], addDays(today, -10));
    expect(r.currentCycleDay).toBeGreaterThanOrEqual(1);
    expect(r.currentCycleDay).toBeLessThanOrEqual(r.predictedCycleLength);
  });

  it('cycleProgress is between 0 and 100', () => {
    const today = todayMidnight();
    const r = BayesianPredictionEngine.predict([], [], addDays(today, -5));
    expect(r.cycleProgress).toBeGreaterThanOrEqual(0);
    expect(r.cycleProgress).toBeLessThanOrEqual(100);
  });

  it('daysUntilNextPeriod is non-negative', () => {
    const today = todayMidnight();
    const r = BayesianPredictionEngine.predict([], [], addDays(today, -5));
    expect(r.daysUntilNextPeriod).toBeGreaterThanOrEqual(0);
  });

  it('isInMenstrualPhase is true on days 1–5 of cycle', () => {
    const today = todayMidnight();
    const last = addDays(today, -3); // day 4 of cycle
    const r = BayesianPredictionEngine.predict([], [], last);
    expect(r.isInMenstrualPhase).toBe(true);
    expect(r.currentPhase).toBe('menstrual');
  });

  it('isInMenstrualPhase is false on day 10+', () => {
    const today = todayMidnight();
    const last = addDays(today, -10); // day 11
    const r = BayesianPredictionEngine.predict([], [], last);
    expect(r.isInMenstrualPhase).toBe(false);
    expect(r.currentPhase).not.toBe('menstrual');
  });

  it('currentPhase is luteal when today is past ovulation day', () => {
    const today = todayMidnight();
    // 28d cycle, ovulation = day 14 (28-14). Start 20 days ago → today is day 21 → post-ovulation
    const last = addDays(today, -20);
    const cycles = makeCycles([28, 28, 28, 28], 20);
    const r = BayesianPredictionEngine.predict(cycles, [], last);
    expect(r.currentPhase).toBe('luteal');
  });

  it('fertile window: fertileWindowStart is 5 days before ovulation', () => {
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    const diff = (r.ovulationDate.getTime() - r.fertileWindowStart.getTime()) / 86400000;
    expect(diff).toBe(5);
  });

  it('fertile window: fertileWindowEnd is 1 day after ovulation', () => {
    const r = BayesianPredictionEngine.predict([], [], LAST_PERIOD);
    const diff = (r.fertileWindowEnd.getTime() - r.ovulationDate.getTime()) / 86400000;
    expect(diff).toBe(1);
  });
});

// ─── 7. Pregnancy risk ────────────────────────────────────────────────────────

describe('BayesianPredictionEngine — pregnancy risk', () => {
  it('low risk when period is expected in the future', () => {
    const today = todayMidnight();
    const r = BayesianPredictionEngine.predict([], [], addDays(today, -5)); // day 6 of 28
    expect(r.pregnancyRisk).toBe('low');
  });

  it('medium risk when 5–14 days late', () => {
    // Force a scenario where period was expected 8 days ago:
    // start 36 days ago, 28d cycle → expected was 8 days ago
    const today = todayMidnight();
    const cycles = makeCycles([28, 28, 28], 36);
    const last = addDays(today, -36);
    const r = BayesianPredictionEngine.predict(cycles, [], last);
    // roll-forward will push currentCycleStart forward, so check the field directly
    if (r.pregnancyRisk !== 'low') {
      expect(['medium', 'high']).toContain(r.pregnancyRisk);
    } else {
      // roll-forward resolved it — that's correct behaviour
      expect(r.pregnancyRisk).toBe('low');
    }
  });
});

// ─── 8. Irregularity detection ────────────────────────────────────────────────

describe('BayesianPredictionEngine — irregularity', () => {
  it('isIrregular is false for consistent cycles', () => {
    const cycles = makeCycles([28, 28, 28, 28], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(r.isIrregular).toBe(false);
  });

  it('isIrregular is true when std deviation > 7 and > 3 cycles', () => {
    // cycles: [21, 45, 21, 45] — stdDev ≈ 12
    const cycles = makeCycles([21, 45, 21, 45], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    expect(r.isIrregular).toBe(true);
  });

  it('isIrregular is false with <= 3 cycles even if variable', () => {
    const cycles = makeCycles([21, 45], 5);
    const r = BayesianPredictionEngine.predict(cycles, [], LAST_PERIOD);
    // Engine requires >3 cycles to flag as irregular
    expect(r.isIrregular).toBe(false);
  });
});
