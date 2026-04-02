import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PeriodCyclesModule } from '../period-cycles/period-cycles.module';
import { DailyLogsAndSymptomsModule } from '../daily-logs-symptoms/daily-logs-symptoms.module';

@Module({
  imports: [PeriodCyclesModule, DailyLogsAndSymptomsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
