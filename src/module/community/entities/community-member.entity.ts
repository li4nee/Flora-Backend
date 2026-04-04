import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from 'src/module/user/entities/user.entity';
import { Community } from './community.entity';

export enum CommunityRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

@Entity()
@Unique(['user', 'community'])
export class CommunityMember extends GlobalEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Community, (community) => community.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'communityId' })
  community!: Community;

  @Column({ type: 'enum', enum: CommunityRole, default: CommunityRole.MEMBER })
  role!: CommunityRole;
}
