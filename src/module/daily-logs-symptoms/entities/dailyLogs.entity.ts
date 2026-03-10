import { User } from 'src/module/user/entities/user.entity';
import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { DailySymptom } from './dailySymptoms.entity';
import { PeriodCycles } from 'src/module/period-cycles/entities/periodCycles.entity';
import { SEVERITY } from 'src/shared/typings/base.typings';

/**
 * CervicalMucus consistency - key fertility indicator.
 * Progression across cycle: dry → sticky → creamy → watery → egg_white (peak fertility)
 */
export enum CervicalMucusType {
  NONE = 'none',
  STICKY = 'sticky',
  CREAMY = 'creamy',
  WATERY = 'watery',
  EGG_WHITE = 'egg_white', // most fertile
}

/**
 * DailyLog entity captures comprehensive daily data for menstrual cycle tracking:
 * - logDate: unique per user, ensures one entry per day.
 * - cycleDay: calculated based on periodCycle start date, helps identify cycle phase.
 * - flow: enum severity of menstrual flow, critical for period tracking.
 * - basalBodyTemp: key ovulation indicator, rises ~0.2°C post-ovulation.
 * - cervicalMucus: enum indicating fertility window, egg-white type is most fertile.
 * - stressLevel, energyLevel, moodLevel, libidoLevel: 1–5 ratings capturing overall well-being and hormonal effects.
 * - medications: JSON array of strings for tracking substances that may affect the cycle.
 * - tookContraceptive: boolean to monitor contraceptive use consistency.
 * - dailySymptoms: one-to-many relation to DailySymptom, capturing specific symptoms and their severity.
 */

@Entity()
export class DailyLog extends GlobalEntity {
  @ManyToOne(() => User)
  user!: User;

  @Index({ unique: true })
  @Column({ type: 'date' })
  logDate!: string;

  @ManyToOne(() => PeriodCycles)
  periodCycle!: PeriodCycles;

  @Column({ nullable: true })
  cycleDay?: number;

  /**
   * Flow severity rating:
   * - NONE: no menstrual flow.
   * - VERY_MILD: spotting or very light flow, not requiring a pad/tampon change.
   * - MILD: light flow, may require 1-2 pad/tampon changes per day.
   * - MODERATE: regular flow, typically requiring 3-5 pad/tampon changes per day.
   * - SEVERE: heavy flow, often requiring 6+ pad/tampon changes per day or overnight protection.
   * - VERY_SEVERE: extremely heavy flow, may require frequent changes and can interfere with daily activities.
   *
   * Why do we need to track flow severity ?
   * Helps identify period days vs. non-period days, track changes in flow patterns across cycles, and can signal hormonal imbalances or health issues when patterns change significantly.
   */

  @Column({ type: 'enum', enum: SEVERITY, default: SEVERITY.NONE })
  flow?: SEVERITY;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Basal Body Temperature in Celsius.
   * BBT rises ~0.2°C after ovulation — a key fertility signal.
   * Typical range: 36.1–37.0°C
   * Tracking BBT helps identify ovulation day, luteal phase length, and can signal potential issues like anovulatory cycles or luteal phase defects when patterns deviate from the norm.
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  basalBodyTemp?: number;

  /**
   * Body weight in kg. Weight fluctuations affect hormonal balance
   * and can influence cycle regularity.
   * Tracking weight helps identify correlations between weight changes and cycle irregularities, and can signal potential issues like PCOS or thyroid dysfunction when significant weight changes coincide with cycle disruptions.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg?: number;

  /**
   * Cervical mucus consistency — direct fertility indicator.
   * Egg-white type strongly correlates with ovulation window.
   * Tracking cervical mucus helps identify fertile days, confirm ovulation, and can signal hormonal imbalances when expected mucus patterns do not occur (e.g., no egg-white mucus during the fertile window).
   */
  @Column({ type: 'enum', enum: CervicalMucusType, nullable: true })
  cervicalMucus?: CervicalMucusType;

  /**
   * Stress level 1–5. High chronic stress elevates cortisol,
   * suppressing GnRH → delayed/missed ovulation, longer cycles.
   * Tracking stress helps identify correlations between stress levels and cycle irregularities, and can signal potential issues like hypothalamic amenorrhea when consistently high stress levels coincide with missed periods or anovulatory cycles.
   */
  @Column({ type: 'int', nullable: true })
  stressLevel?: number; // 1 (low) to 5 (high)

  /**
   * Overall energy level 1–5. Low energy can correlate with
   * luteal phase deficiency or thyroid issues.
   * Tracking energy levels helps identify correlations between energy fluctuations and cycle phases, and can signal potential issues like thyroid dysfunction or luteal phase defects when consistently low energy levels coincide with specific cycle phases or symptoms.
   */
  @Column({ type: 'int', nullable: true })
  energyLevel?: number; // 1 (exhausted) to 5 (energized)

  /**
   * Mood rating 1–5. Sharp mood drops can signal PMS onset
   * or luteal phase beginning — useful for phase detection.
   * Tracking mood helps identify correlations between mood fluctuations and cycle phases, and can signal potential issues like PMDD or hormonal imbalances when severe mood swings coincide with specific cycle phases or symptoms.
   */
  @Column({ type: 'int', nullable: true })
  moodLevel?: number; // 1 (very low) to 5 (great)

  /**
   * Libido 1–5. Peaks naturally around ovulation due to
   * estrogen surge — useful for ovulation cross-confirmation.
   * Tracking libido helps identify correlations between libido fluctuations and cycle phases, and can signal potential issues like hormonal imbalances or thyroid dysfunction when significant libido changes coincide with specific cycle phases or symptoms.
   */
  @Column({ type: 'int', nullable: true })
  libidoLevel?: number; // 1 (low) to 5 (high)

  /**
   * Free-text list of medications/supplements taken today.
   * Stored as JSON array of strings e.g. ["Folic Acid 400mcg", "Vitamin D3"]
   * Certain meds (NSAIDs, hormonal contraceptives) directly affect cycle.
   * Tracking medications helps identify correlations between medication use and cycle changes, and can signal potential issues like hormonal imbalances or side effects when specific medications coincide with significant cycle disruptions or symptom changes.
   */
  @Column({ type: 'jsonb', nullable: true, default: [] })
  medications?: string[];

  /**
   * Was hormonal contraception taken today?
   * Tracks consistency of contraceptive use.
   * Inconsistent use can lead to breakthrough bleeding, irregular cycles, or reduced contraceptive effectiveness.
   */
  @Column({ type: 'boolean', nullable: true })
  tookContraceptive?: boolean;

  @OneToMany(() => DailySymptom, (dailySymptom) => dailySymptom.dailyLog, { cascade: true })
  dailySymptoms?: DailySymptom[];
}
