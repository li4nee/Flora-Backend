import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class PeriodCycleEndLogDto {
  @ApiProperty({
    description: 'The end date of the period cycle in ISO format (YYYY-MM-DD)',
    example: '2025-04-30',
    required: true,
  })
  @IsDateString()
  periodEndDate!: string;

  @ApiPropertyOptional({
    description: 'Optional notes about the period cycle end',
    example: 'Felt better towards the end of the cycle.',
    required: false,
  })
  notes?: string;
}
