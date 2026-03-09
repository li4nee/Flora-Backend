import { Controller } from '@nestjs/common';
import { PeriodCyclesService } from './period-cycles.service';

@Controller('period-cycles')
export class PeriodCyclesController {
  constructor(private readonly periodCyclesService: PeriodCyclesService) {}
}
