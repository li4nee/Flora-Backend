import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SEVERITY } from '../../../shared/typings/base.typings';
import { CervicalMucusType } from '../entities/dailyLogs.entity';
import { DailyLogSymptomCreateDto } from './createDailyLog.dto';

export class DailyLogUpdateDto {
  @ApiPropertyOptional({
    enum: SEVERITY,
    example: SEVERITY.MILD,
    description: 'Menstrual flow severity',
  })
  @IsOptional()
  @IsEnum(SEVERITY)
  @Type(() => Number)
  flow?: SEVERITY;

  @ApiPropertyOptional({
    type: String,
    example: 'Updated note',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 37.2,
    description: 'Basal body temperature in Celsius (35.0-42.0)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(35.0)
  @Max(42.0)
  basalBodyTemp?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 65.5,
    description: 'Weight in kilograms (20.0-300.0)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20.0)
  @Max(300.0)
  weightKg?: number;

  @ApiPropertyOptional({
    enum: CervicalMucusType,
    example: CervicalMucusType.CREAMY,
    description: 'Cervical mucus type',
  })
  @IsOptional()
  @IsEnum(CervicalMucusType)
  cervicalMucus?: CervicalMucusType;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
    description: 'Stress level (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  stressLevel?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 4,
    description: 'Energy level (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  energyLevel?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 4,
    description: 'Mood level (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  moodLevel?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 3,
    description: 'Libido level (1-5)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  libidoLevel?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Ibuprofen', 'Vitamin D'],
    description: 'List of medications taken',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Whether contraceptive was taken',
  })
  @IsOptional()
  @IsBoolean()
  tookContraceptive?: boolean;

  @ApiPropertyOptional({
    type: Number,
    example: 8.5,
    description: 'Hours of sleep',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  @Type(() => Number)
  sleepHours?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    description: 'Whether intensive exercise was performed',
  })
  @IsOptional()
  @IsBoolean()
  isIntensiveExercise?: boolean;

  @ApiPropertyOptional({
    type: [DailyLogSymptomCreateDto],
    description: 'Array of daily symptoms',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyLogSymptomCreateDto)
  dailySymptoms?: DailyLogSymptomCreateDto[];
}
