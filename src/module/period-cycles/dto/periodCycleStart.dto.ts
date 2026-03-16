import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PeriodCycleStartLogDto {
  @ApiProperty({
    description: 'The start date of the period cycle in YYYY-MM-DD format',
    example: '2025-04-01',
    required: true,
  })
  @IsDateString()
  periodStartDate!: string;

  @ApiProperty({
    description: 'Optional notes about the period cycle',
    example: 'Felt a bit tired during the first day.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
