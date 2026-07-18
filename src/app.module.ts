import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    SharedModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync(TypeOrmConfig.getOrmConfig()),
    AuthModule,
    UserModule,
    PredictionsModule,
    ReportsModule,
    DailyLogsAndSymptomsModule,
    PeriodCyclesModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
