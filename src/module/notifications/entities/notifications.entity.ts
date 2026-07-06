import { User } from '../../user/entities/user.entity';
import { GlobalEntity } from '../../../shared/db/globalEntity';
import { Column, Entity, OneToOne } from 'typeorm';

/**
 * @extends GlobalEntity
 * Represents a notification entity with properties for the user, period notification, fertility notification, reminder time, and daily log notification.
 * @property {user} - The user associated with the notification settings.
 * @property {periodNotification} - Indicates whether period notifications are enabled for the user.
 * @property {fertilityNotification} - Indicates whether fertility notifications are enabled for the user.
 * @property {reminderTime} - The time at which reminders should be sent to the user.
 * @property {dailyLogNotification} - Indicates whether daily log notifications are enabled for the user.
 */
@Entity()
export class Notification extends GlobalEntity {
  constructor() {
    super();
  }
  @OneToOne(() => User, (user) => user.notification)
  user!: User;

  @Column({ default: false })
  periodNotification!: boolean;

  @Column({ default: false })
  fertilityNotification!: boolean;

  @Column({ type: 'time', nullable: true })
  reminderTimeInUTC!: string | null;

  @Column({ default: false })
  dailyLogNotification!: boolean;
}
