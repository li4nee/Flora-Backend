import { Controller } from '@nestjs/common';

@Controller('daily-symptoms')
export class DailyLogsAndSymptomsController {
  constructor(private readonly dailySymptomsService: DailyLogsAndSymptomsController) {}
}
