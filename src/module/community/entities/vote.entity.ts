import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from 'src/module/user/entities/user.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';

@Entity()
// User can only vote once per post or comment
@Unique(['user', 'post'])
@Unique(['user', 'comment'])
export class Vote extends GlobalEntity {
  @Column({ enum: [-1, 1] })
  value!: number; // 1 for upvote, -1 for downvote

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Post, (post) => post.votes, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post?: Post;

  @ManyToOne(() => Comment, (comment) => comment.votes, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment?: Comment;
}
