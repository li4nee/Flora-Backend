import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { UpdateEmailDto, UpdatePasswordDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { UpdateNotificationDto } from './dto/update-notification.dto';
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUserId() userId: string) {
    return await this.userService.findByIdAndRelationWithProfileAndNotification(userId);
  }

  @Patch('me/email')
  @UseGuards(JwtAuthGuard)
  async updateEmail(@CurrentUserId() userId: string, @Body() dto: UpdateEmailDto) {
    return await this.userService.updateEmail(userId, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(@CurrentUserId() userId: string, @Body() dto: UpdatePasswordDto) {
    return await this.userService.updatePassword(userId, dto);
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return await this.userService.updateProfile(userId, dto);
  }

  @Put('me/notifications')
  @UseGuards(JwtAuthGuard)
  async updateNotifications(@CurrentUserId() userId: string, @Body() dto: UpdateNotificationDto) {
    return await this.userService.updateNotifications(userId, dto);
  }
}
