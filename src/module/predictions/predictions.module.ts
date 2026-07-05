import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';
import { PeriodCyclesModule } from '../period-cycles/period-cycles.module';
import { DailyLogsAndSymptomsModule } from '../daily-logs-symptoms/daily-logs-symptoms.module';

@Module({
  imports: [PeriodCyclesModule, DailyLogsAndSymptomsModule],
  providers: [PredictionsService],
  controllers: [PredictionsController],
  exports: [PredictionsService],
})
export class PredictionsModule {}
