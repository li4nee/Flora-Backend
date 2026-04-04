import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from 'src/module/user/entities/user.entity';
import { Post } from './post.entity';
import { Vote } from './vote.entity';

@Entity()
export class Comment extends GlobalEntity {
  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parentComment?: Comment;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies!: Comment[];

  @OneToMany(() => Vote, (vote) => vote.comment, { cascade: true })
  votes!: Vote[];

  @Column({ default: 0 })
  upvotesCount!: number;

  @Column({ default: 0 })
  downvotesCount!: number;

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
