import { User } from 'src/module/user/entities/user.entity';
import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

/**
 * @extends GlobalEntity
 * Represents a period cycle entity with properties for the user, start date, and cycle length.
 * @property {user} - The user associated with the period cycle.
 * @property {startDate} - The start date of the period cycle.
 * @property {endDate} - The end date of the period cycle (optional).
 * @property {periodLength} - The length of the period in days (optional).
 * @property {cycleLength} - The length of the period cycle in days.
 */
@Entity()
export class PeriodCycles extends GlobalEntity {
  @ManyToOne(() => User)
  user!: User;

  @Column({ type: 'date', nullable: false })
  @Index()
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  @Index()
  endDate?: string;

  @Column({ type: 'int', nullable: true })
  periodLength?: number;

  @Column({ nullable: true })
  cycleLength?: number;
}
