import { User } from 'src/module/user/entities/user.entity';
import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

@Entity()
export class DailyLog extends GlobalEntity {
  @ManyToOne(() => User)
  user!: User;

  @Index()
  @Column({ type: 'date' })
  logDate!: string;
}
