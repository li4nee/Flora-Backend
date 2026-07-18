import { GlobalEntity } from '../../../shared/db/globalEntity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Profile } from './profile.entity';
import { Notification } from '../../notifications/entities/notifications.entity';

/**
 * @extends GlobalEntity
 * Represents a user entity with properties for email, password, email verification status, and block status.
 * @property {email} - The email address of the user.
 * @property {password} - The password of the user.
 * @property {isEmailVerified} - Indicates whether the user's email is verified.
 * @property {isBlocked} - Indicates whether the user is blocked.
 * @property {notification} - A one-to-one relationship with the Notification entity, representing the user's notification settings.
 * @relation {profile} - A one-to-one relationship with the Profile entity, representing the user's profile information.
 */
@Entity()
export class User extends GlobalEntity {
  constructor() {
    super();
  }

  @Column()
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ default: false })
  isBlocked!: boolean;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  @JoinColumn()
  profile?: Profile;

  @OneToOne(() => Notification, (notification) => notification.user, { cascade: true })
  @JoinColumn()
  notification!: Notification;
}
