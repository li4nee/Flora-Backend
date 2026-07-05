import { GlobalEntity } from 'src/shared/db/globalEntity';
import { User } from 'src/module/user/entities/user.entity';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
@Index(['userId', 'type'])
export class EmailToken extends GlobalEntity {
  @Column()
  token!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  expiresAt!: Date;

  @Column()
  type!: 'verify' | 'reset';

  @Column({ default: false })
  isUsed!: boolean;
}
