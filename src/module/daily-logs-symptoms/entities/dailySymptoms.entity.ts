import { GlobalEntity } from '../../../shared/db/globalEntity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { DailyLog } from './dailyLogs.entity';
import { SEVERITY } from '../../../shared/typings/base.typings';

/**
 * SymptomType enum categorizes common menstrual symptoms, facilitating consistent tracking:
- CRAMPS: abdominal pain during menstruation.
- FLOW: intensity of menstrual bleeding.
- MOOD: emotional fluctuations (e.g., irritability, sadness).
- FATIGUE: feelings of tiredness or low energy.
- HEADACHE: frequency and severity of headaches.
- BLOATING: sensation of abdominal fullness or swelling.
- BREAST_TENDERNESS: sensitivity or pain in the breasts.
- ACNE: skin breakouts related to hormonal changes.
- BACK_PAIN: lower back discomfort during the cycle.
- NAUSEA: feelings of queasiness or stomach upset.
- SLEEP_ISSUES: difficulties with sleep quality or duration.
- APPETITE_CHANGES: variations in hunger or food cravings.
- OTHER: for symptoms not categorized above, allowing users to specify additional experiences.
 */
export enum SymptomType {
  CRAMPS = 'cramps',
  FLOW = 'flow',
  MOOD = 'mood',
  FATIGUE = 'fatigue',
  HEADACHE = 'headache',
  BLOATING = 'bloating',
  BREAST_TENDERNESS = 'breast_tenderness',
  ACNE = 'acne',
  BACK_PAIN = 'back_pain',
  NAUSEA = 'nausea',
  SLEEP_ISSUES = 'sleep_issues',
  APPETITE_CHANGES = 'appetite_changes',
  OTHER = 'other',
}

/**
 * DailySymptom entity captures specific symptoms experienced on a given day, linked to the DailyLog:
 * - dailyLog: many-to-one relation to DailyLog, allowing multiple symptoms per day.
 * - symptomType: enum categorizing common menstrual symptoms (cramps, mood, fatigue, etc.).
 * - severity: enum rating the intensity of the symptom (none, mild, moderate, severe).
 * This structure enables detailed tracking of symptom patterns across the menstrual cycle.
 */
@Entity()
export class DailySymptom extends GlobalEntity {
  @ManyToOne(() => DailyLog, (dailyLog) => dailyLog.dailySymptoms, {
    onDelete: 'CASCADE',
  })
  dailyLog!: DailyLog;

  @Column({
    type: 'enum',
    enum: SymptomType,
  })
  symptomType!: SymptomType;

  /**
   * Severity rating for the symptom:
   * - NONE: no symptom experienced.
   * - VERY_MILD: symptom is barely noticeable and does not affect daily activities.
   * - MILD: symptom is present but does not interfere with daily activities.
   * - MODERATE: symptom causes some discomfort and may interfere with activities.
   * - SEVERE: symptom is intense and significantly impacts daily functioning.
   * - VERY_SEVERE: symptom is debilitating and may require medical attention.
   */
  @Column({ type: 'enum', enum: SEVERITY })
  severity?: SEVERITY;
}
