import { Controller } from '@nestjs/common';
import { DailySymptomsService } from './daily-symptoms.service';

@Controller('daily-symptoms')
export class DailySymptomsController {
  constructor(private readonly dailySymptomsService: DailySymptomsService) {}
}
