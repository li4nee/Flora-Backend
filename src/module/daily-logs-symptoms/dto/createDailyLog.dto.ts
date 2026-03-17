import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SEVERITY } from 'src/shared/typings/base.typings';
import { CervicalMucusType } from '../entities/dailyLogs.entity';
import { SymptomType } from '../entities/dailySymptoms.entity';

export class DailyLogSymptomCreateDto {
  @ApiProperty({
    enum: SymptomType,
    example: SymptomType.CRAMPS,
    description: 'Type of symptom',
  })
  @IsEnum(SymptomType)
  symptomType!: SymptomType;

  @ApiProperty({
    enum: SEVERITY,
    example: SEVERITY.MODERATE,
    description: 'Severity level of the symptom',
  })
  @IsEnum(SEVERITY)
  severity!: SEVERITY;
}

export class DailyLogCreateDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-01-15T10:30:00Z',
    description: 'Date of the daily log',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Period cycle ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  periodCycleId?: string;

  @ApiProperty({
    enum: SEVERITY,
    example: SEVERITY.MILD,
    description: 'Menstrual flow severity',
    required: false,
  })
  @IsOptional()
  @IsEnum(SEVERITY)
  @Type(() => Number)
  flow?: SEVERITY;

  @ApiProperty({
    type: String,
    example: 'Felt great today',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: Number,
    example: 37.2,
    description: 'Basal body temperature in Celsius (35.0-42.0)',
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(35.0)
  @Max(42.0)
  basalBodyTemp?: number;

  @ApiProperty({
    type: Number,
    example: 65.5,
    description: 'Weight in kilograms (20.0-300.0)',
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20.0)
  @Max(300.0)
  weightKg?: number;

  @ApiProperty({
    enum: CervicalMucusType,
    example: CervicalMucusType.CREAMY,
    description: 'Cervical mucus type',
    required: false,
  })
  @IsOptional()
  @IsEnum(CervicalMucusType)
  cervicalMucus?: CervicalMucusType;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Stress level (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  stressLevel?: number;

  @ApiProperty({
    type: Number,
    example: 4,
    description: 'Energy level (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  energyLevel?: number;

  @ApiProperty({
    type: Number,
    example: 4,
    description: 'Mood level (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  moodLevel?: number;

  @ApiProperty({
    type: Number,
    example: 3,
    description: 'Libido level (1-5)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  libidoLevel?: number;

  @ApiProperty({
    type: [String],
    example: ['Ibuprofen', 'Vitamin D'],
    description: 'List of medications taken',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether contraceptive was taken',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  tookContraceptive?: boolean;

  @ApiProperty({
    type: [DailyLogSymptomCreateDto],
    description: 'Array of daily symptoms',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyLogSymptomCreateDto)
  dailySymptoms?: DailyLogSymptomCreateDto[];
}
