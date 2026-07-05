import { User } from 'src/module/user/entities/user.entity';
import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

/**
 * @extends GlobalEntity
 * Represents a single device's FCM registration token. A user may have several
 * (phone + tablet, or a reinstalled app), so tokens are stored one-per-row rather
 * than as a single column on the user/notification settings.
 * @property {user} - The user this device token belongs to.
 * @property {token} - The FCM registration token itself (unique per device install).
 * @property {platform} - Informational only: 'ios' | 'android' | 'web'.
 * @property {lastSeenAt} - Bumped every time the client re-registers this token.
 */
@Entity()
export class DeviceToken extends GlobalEntity {
  constructor() {
    super();
  }

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column({ unique: true })
  token!: string;

  @Column({ nullable: true })
  platform!: string | null;

  @Column({ type: 'timestamp' })
  lastSeenAt!: Date;
}
