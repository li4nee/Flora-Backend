import { Column, Entity, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { GlobalEntity } from '../../../shared/db/globalEntity';

/**
 * @extends GlobalEntity
 * Represents a user profile entity with properties for first name, last name, date of birth, last period date, period length, cycle length, and period regularity.
 * @property {firstName} - The first name of the user.
 * @property {lastName} - The last name of the user.
 * @property {averageCycleLength} - The average length of the user's menstrual cycle in days (optional).
 * @property {averagePeriodLength} - The average length of the user's period in days (optional).
 * @property {dateOfBirth} - The date of birth of the user.
 */
@Entity()
export class Profile extends GlobalEntity {
  constructor() {
    super();
  }

  @OneToOne(() => User, (User: User) => User.profile)
  user!: User;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  averageCycleLength?: number;

  @Column({ nullable: true })
  averagePeriodLength?: number;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date | null;
}
