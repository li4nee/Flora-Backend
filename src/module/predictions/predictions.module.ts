import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service';

@Module({
  providers: [PredictionsService],
})
export class PredictionsModule {}
