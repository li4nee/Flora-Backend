import { Module } from '@nestjs/common';
import { PeriodCyclesService } from './period-cycles.service';
import { PeriodCyclesController } from './period-cycles.controller';

@Module({
  controllers: [PeriodCyclesController],
  providers: [PeriodCyclesService],
})
export class PeriodCyclesModule {}
