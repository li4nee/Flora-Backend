import { CreateDateColumn, UpdateDateColumn, Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class GlobalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt!: Date;

  @Column({ default: false })
  trash!: boolean;
}
