import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { UserUpdateEmailDto, UserUpdatePasswordDto } from './dto/update-user.dto';
import { UserUpdateProfileDto } from './dto/update-profile.dto';
import { UserUpdateNotificationDto } from './dto/update-notification.dto';
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user with profile and notification settings' })
  @ApiBearerAuth()
  async getProfile(@CurrentUserId() userId: string) {
    return await this.userService.findByIdAndRelationWithProfileAndNotification(userId);
  }

  @Patch('me/email')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Patch the email of current user' })
  @ApiBearerAuth()
  async updateEmail(@CurrentUserId() userId: string, @Body() dto: UserUpdateEmailDto) {
    await this.userService.updateEmail(userId, dto);
    return { message: 'Email updated successfully' };
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Patch the password of current user' })
  @ApiBearerAuth()
  async updatePassword(@CurrentUserId() userId: string, @Body() dto: UserUpdatePasswordDto) {
    await this.userService.updatePassword(userId, dto);
    return { message: 'Password updated successfully' };
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update the profile of current user' })
  @ApiBearerAuth()
  async updateProfile(@CurrentUserId() userId: string, @Body() dto: UserUpdateProfileDto) {
    const profile = await this.userService.updateProfile(userId, dto);
    return { message: 'Profile updated successfully', user: profile };
  }

  @Put('me/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update the notification settings of current user' })
  @ApiBearerAuth()
  async updateNotifications(@CurrentUserId() userId: string, @Body() dto: UserUpdateNotificationDto) {
    const notification = await this.userService.updateNotifications(userId, dto);
    return { message: 'Notification settings updated successfully', user: notification };
  }
}
