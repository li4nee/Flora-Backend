import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from './entities/community.entity';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Vote } from './entities/vote.entity';
import { CommunityMember } from './entities/community-member.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [TypeOrmModule.forFeature([Community, Post, Comment, Vote, CommunityMember]), CloudinaryModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
