import { Controller } from '@nestjs/common';
import { DailyLogsAndSymptomsService } from './daily-logs-symptoms.service';

@Controller('daily-symptoms')
export class DailyLogsAndSymptomsController {
  constructor(private readonly dailySymptomsService: DailyLogsAndSymptomsService) {}
}
