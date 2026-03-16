import { Module } from '@nestjs/common';
import { PeriodCyclesService } from './period-cycles.service';
import { PeriodCyclesController } from './period-cycles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodCycles } from './entities/periodCycles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodCycles])],
  controllers: [PeriodCyclesController],
  providers: [PeriodCyclesService],
})
export class PeriodCyclesModule {}
