import { Module } from '@nestjs/common';
import { DailySymptomsService } from './daily-symptoms.service';
import { DailySymptomsController } from './daily-symptoms.controller';

@Module({
  controllers: [DailySymptomsController],
  providers: [DailySymptomsService],
})
export class DailySymptomsModule {}
