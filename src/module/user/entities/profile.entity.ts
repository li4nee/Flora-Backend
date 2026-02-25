import { Column, Entity, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { GlobalEntity } from 'src/shared/db/globalEntity';

/**
 * @extends GlobalEntity
 * Represents a user profile entity with properties for first name, last name, date of birth, last period date, period length, cycle length, and period regularity.
 * @property {firstName} - The first name of the user.
 * @property {lastName} - The last name of the user.
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

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date | null;
}
