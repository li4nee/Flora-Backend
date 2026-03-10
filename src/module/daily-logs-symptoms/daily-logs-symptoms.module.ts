import { Module } from '@nestjs/common';
import { DailyLogsAndSymptomsService } from './daily-logs-symptoms.service';
import { DailyLogsAndSymptomsController } from './daily-logs-symptoms.controller';

@Module({
  controllers: [DailyLogsAndSymptomsController],
  providers: [DailyLogsAndSymptomsService],
})
export class DailySymptomsModule {}
