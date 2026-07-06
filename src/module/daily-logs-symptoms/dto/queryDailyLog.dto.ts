import { IsDateString, IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { SEVERITY, SortOrder } from '../../../shared/typings/base.typings';
import { CervicalMucusType } from '../entities/dailyLogs.entity';
import { SymptomType } from '../entities/dailySymptoms.entity';

export enum SymptomSortMode {
  MAX_SEVERITY = 'maxSeverity',
  COUNT = 'count',
  SPECIFIC = 'specific',
}

export enum LogSortField {
  LOG_DATE = 'logDate',
  CREATED_AT = 'createdAt',
  STRESS_LEVEL = 'stressLevel',
  ENERGY_LEVEL = 'energyLevel',
  MOOD_LEVEL = 'moodLevel',
  LIBIDO_LEVEL = 'libidoLevel',
  BASAL_BODY_TEMP = 'basalBodyTemp',
  WEIGHT_KG = 'weightKg',
  CYCLE_DAY = 'cycleDay',
  FLOW = 'flow',
}

export class DailyLogQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date (inclusive) for filtering logs. Format: YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'End date (inclusive) for filtering logs. Format: YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter logs belonging to a specific menstrual cycle.',
  })
  @IsOptional()
  periodCycleId?: string;

  @ApiPropertyOptional({
    enum: SEVERITY,
    example: SEVERITY.MODERATE,
    description: 'Filter logs by menstrual flow severity (NONE, MILD, MODERATE, SEVERE).',
  })
  @IsOptional()
  @IsEnum(SEVERITY)
  @Type(() => Number)
  flow?: SEVERITY;

  @ApiPropertyOptional({
    enum: CervicalMucusType,
    example: CervicalMucusType.CREAMY,
    description: 'Filter by cervical mucus type (indicates fertility phase).',
  })
  @IsOptional()
  @IsEnum(CervicalMucusType)
  cervicalMucus?: CervicalMucusType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Minimum stress level to filter logs (1–5).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevelMin?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum stress level to filter logs (1–5).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevelMax?: number;

  @ApiPropertyOptional({
    isArray: true,
    enum: SymptomType,
    example: [SymptomType.HEADACHE, SymptomType.CRAMPS],
    description: 'Filter logs that contain ANY of the specified symptom types.',
  })
  @IsOptional()
  @IsEnum(SymptomType, { each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value as SymptomType[];
    if (typeof value === 'string') return value.split(',');
    return [];
  })
  symptomTypes?: SymptomType[];

  @ApiPropertyOptional({
    enum: SEVERITY,
    example: SEVERITY.SEVERE,
    description: 'Filter logs where symptoms have a specific severity.',
  })
  @IsOptional()
  @IsEnum(SEVERITY)
  @Type(() => Number)
  symptomSeverity?: SEVERITY;

  @ApiPropertyOptional({
    example: 'pain',
    description: 'Search text in the notes field (partial match).',
  })
  @IsOptional()
  @IsString()
  searchNotes?: string;

  @ApiPropertyOptional({
    example: 'Ibuprofen',
    description: 'Search text in medications array (partial match).',
  })
  @IsOptional()
  @IsString()
  searchMedications?: string;

  @ApiPropertyOptional({
    enum: LogSortField,
    default: LogSortField.LOG_DATE,
    description: 'Field to sort the logs by. E.g., logDate, stressLevel, weightKg.',
  })
  @IsOptional()
  @IsEnum(LogSortField)
  sortBy?: LogSortField = LogSortField.LOG_DATE;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sorting order: ASC (ascending) or DESC (descending).',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    enum: SymptomSortMode,
    example: SymptomSortMode.MAX_SEVERITY,
    description: `Advanced symptom-based sorting mode:
- maxSeverity → Sort logs by the highest symptom severity within each log.
- count → Sort logs by the total number of symptoms recorded.
- specific → Sort logs by severity of a specific symptom (requires sortSymptomType).`,
  })
  @IsOptional()
  @IsEnum(SymptomSortMode)
  symptomSortMode?: SymptomSortMode;

  @ApiPropertyOptional({
    enum: SymptomType,
    example: SymptomType.CRAMPS,
    description: 'Required when symptomSortMode = "specific". Defines which symptom to sort by.',
  })
  @IsOptional()
  @IsEnum(SymptomType)
  sortSymptomType?: SymptomType;
}
