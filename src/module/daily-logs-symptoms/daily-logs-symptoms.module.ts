import { Module } from '@nestjs/common';
import { DailyLogsAndSymptomsService } from './daily-logs-symptoms.service';
import { DailyLogsAndSymptomsController } from './daily-logs-symptoms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyLog } from './entities/dailyLogs.entity';
import { DailySymptom } from './entities/dailySymptoms.entity';
import { PeriodCyclesModule } from '../period-cycles/period-cycles.module';

@Module({
  imports: [TypeOrmModule.forFeature([DailyLog, DailySymptom]), PeriodCyclesModule],
  controllers: [DailyLogsAndSymptomsController],
  providers: [DailyLogsAndSymptomsService],
})
export class DailyLogsAndSymptomsModule {}
