import { GlobalEntity } from 'src/shared/db/globalEntity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Post } from './post.entity';
import { CommunityMember } from './community-member.entity';

@Entity()
export class Community extends GlobalEntity {
  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  iconUrl?: string;

  @Column({ nullable: true })
  bannerUrl?: string;

  @Column({ default: 0 })
  membersCount!: number;

  @OneToMany(() => Post, (post) => post.community, { cascade: true })
  posts!: Post[];

  @OneToMany(() => CommunityMember, (member) => member.community, { cascade: true })
  members!: CommunityMember[];
}
