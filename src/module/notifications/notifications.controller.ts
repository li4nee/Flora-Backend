import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto, UnregisterDeviceTokenDto } from './dto/device-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-token')
  @ApiOperation({ summary: 'Register (or refresh) an FCM device token for the current user' })
  async registerDeviceToken(@CurrentUserId() userId: string, @Body() dto: RegisterDeviceTokenDto) {
    await this.notificationsService.registerDeviceToken(userId, dto);
    return { message: 'Device token registered successfully' };
  }

  @Delete('device-token')
  @ApiOperation({ summary: 'Unregister an FCM device token for the current user (e.g. on logout)' })
  async unregisterDeviceToken(@CurrentUserId() userId: string, @Body() dto: UnregisterDeviceTokenDto) {
    await this.notificationsService.unregisterDeviceToken(userId, dto.token);
    return { message: 'Device token unregistered successfully' };
  }
}
