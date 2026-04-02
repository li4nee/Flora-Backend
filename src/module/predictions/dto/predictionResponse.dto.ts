import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from 'src/shared/dto/baseResponse.dto';

class PredictedCycleStatusDto {
  @ApiProperty({ example: 31, description: 'Predicted cycle length in days' })
  predictedCycleLength: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z', description: 'Predicted next period start date' })
  nextPeriodDate: Date;

  @ApiProperty({ example: '2026-04-12T00:00:00.000Z', description: 'Predicted start of the fertile window' })
  fertileWindowStart: Date;

  @ApiProperty({ example: '2026-04-18T00:00:00.000Z', description: 'Predicted end of the fertile window' })
  fertileWindowEnd: Date;

  @ApiProperty({ example: '2026-04-17T00:00:00.000Z', description: 'Predicted ovulation date' })
  ovulationDate: Date;

  @ApiProperty({ example: null, nullable: true, description: 'Confirmed ovulation date from BBT shift if available' })
  bbtConfirmedOvulationDate: Date | null;

  @ApiProperty({ enum: ['low', 'medium', 'high'], example: 'low' })
  pregnancyRisk: 'low' | 'medium' | 'high';

  @ApiProperty({ example: false })
  isIrregular: boolean;

  @ApiProperty({ example: 'low', enum: ['very_low', 'low', 'medium', 'high'] })
  confidence: 'very_low' | 'low' | 'medium' | 'high';

  @ApiProperty({ example: 'Based on limited history.', nullable: true })
  confidenceNote?: string;

  @ApiProperty({ example: ['High stress (+0.4 days)'], type: [String] })
  activeAdjustments: string[];

  // Frontend fields
  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  currentCycleStart: Date;

  @ApiProperty({ example: 14, description: 'Day number within the current cycle' })
  currentCycleDay: number;

  @ApiProperty({ example: 45, description: 'Progress percentage (0-100)' })
  cycleProgress: number;

  @ApiProperty({ example: 17, description: 'Days remaining until next period' })
  daysUntilNextPeriod: number;

  @ApiProperty({ enum: ['menstrual', 'follicular', 'fertile', 'ovulation', 'luteal'], example: 'follicular' })
  currentPhase: 'menstrual' | 'follicular' | 'fertile' | 'ovulation' | 'luteal';

  @ApiProperty({ example: false })
  isInFertileWindow: boolean;

  @ApiProperty({ example: false })
  isOvulationDay: boolean;

  @ApiProperty({ example: false })
  isInMenstrualPhase: boolean;

  @ApiProperty({ example: true, description: 'True if cycle was estimated due to lack of recent logs' })
  isEstimated: boolean;

  @ApiProperty({ example: 8, description: 'How many cycles forward were estimated' })
  estimatedCyclesForward: number;
}

export class PredictionResponseDto extends BaseResponseDto {
  @ApiProperty({ type: PredictedCycleStatusDto })
  data: PredictedCycleStatusDto;
}
