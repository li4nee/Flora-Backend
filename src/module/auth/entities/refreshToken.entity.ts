import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { GlobalEntity } from 'src/shared/db/globalEntity';
import { User } from 'src/module/user/entities/user.entity';

@Entity()
export class RefreshToken extends GlobalEntity {
  constructor() {
    super();
  }

  @Column()
  token!: string;

  @Column()
  expiresAt!: Date;

  @Column()
  userId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: true })
  device?: string;

  @Column({ nullable: true })
  ipAddress?: string;
}
