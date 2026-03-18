import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity } from 'typeorm';

@Entity()
export class EmailToken extends GlobalEntity {
  @Column()
  token!: string;

  @Column()
  userId!: string;

  @Column()
  expiresAt!: Date;

  @Column()
  type!: 'verify' | 'reset';
}
