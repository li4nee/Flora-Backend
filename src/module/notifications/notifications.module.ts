import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notifications.entity';
import { DeviceToken } from './entities/deviceToken.entity';
import { PredictionsModule } from '../predictions/predictions.module';
import { DailyLogsAndSymptomsModule } from '../daily-logs-symptoms/daily-logs-symptoms.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, DeviceToken]), PredictionsModule, DailyLogsAndSymptomsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
