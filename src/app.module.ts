import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './shared/config/typeOrm.config';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { PredictionsModule } from './module/predictions/predictions.module';
import { ReportsModule } from './module/reports/reports.module';
import { PeriodCyclesModule } from './module/period-cycles/period-cycles.module';
import { NotificationsModule } from './module/notifications/notifications.module';
import { DailyLogsAndSymptomsModule } from './module/daily-logs-symptoms/daily-logs-symptoms.module';
import { CommunityModule } from './module/community/community.module';
import { CloudinaryModule } from './module/cloudinary/cloudinary.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forRootAsync(TypeOrmConfig.getOrmConfig()),
    AuthModule,
    UserModule,
    PredictionsModule,
    ReportsModule,
    DailyLogsAndSymptomsModule,
    PeriodCyclesModule,
    NotificationsModule,
    CommunityModule,
    CloudinaryModule,
  ],
})
export class AppModule {}
