import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from 'src/module/user/entities/user.entity';
import { Community } from './community.entity';
import { Vote } from './vote.entity';
import { Comment } from './comment.entity';

@Entity()
export class Post extends GlobalEntity {
  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', array: true, nullable: true })
  mediaUrls?: string[];

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @ManyToOne(() => Community, (community) => community.posts, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'communityId' })
  community!: Community;

  @OneToMany(() => Comment, (comment) => comment.post, { cascade: true })
  comments!: Comment[];

  @OneToMany(() => Vote, (vote) => vote.post, { cascade: true })
  votes!: Vote[];

  @Column({ default: 0 })
  upvotesCount!: number;

  @Column({ default: 0 })
  downvotesCount!: number;

  @Column({ default: 0 })
  commentsCount!: number;

  @Column({ default: false })
  isLocked!: boolean;

  @Column({ default: true })
  isApproved!: boolean;

  @Column({ type: 'text', nullable: true })
  moderationReason?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moderatedById' })
  moderatedBy?: User;
}
