import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './shared/config/typeOrm.config';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { PredictionsModule } from './module/predictions/predictions.module';
import { ReportsModule } from './module/reports/reports.module';
import { DailySymptomsModule } from './module/daily-logs-symptoms/daily-logs-symptoms.module';
import { PeriodCyclesModule } from './module/period-cycles/period-cycles.module';
import { NotificationsModule } from './module/notifications/notifications.module';

@Module({
  imports: [
    SharedModule,
    TypeOrmModule.forRootAsync(TypeOrmConfig.getOrmConfig()),
    AuthModule,
    UserModule,
    PredictionsModule,
    ReportsModule,
    DailySymptomsModule,
    PeriodCyclesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
