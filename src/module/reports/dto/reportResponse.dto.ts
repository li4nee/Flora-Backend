import { ApiProperty } from '@nestjs/swagger';

class CycleSummaryDto {
  @ApiProperty({ example: 28, description: 'Average cycle length in days' })
  avgCycleLength: number;

  @ApiProperty({ example: 5, description: 'Average period length in days' })
  avgPeriodLength: number;

  @ApiProperty({ example: 1.5, description: 'Standard deviation of cycle lengths' })
  cycleVariation: number;

  @ApiProperty({ enum: ['very_regular', 'regular', 'irregular'], example: 'regular' })
  regularityStatus: string;

  @ApiProperty({ example: true, description: 'True if cycle variation is within healthy bounds' })
  isRegular: boolean;

  @ApiProperty({ example: 12, description: 'Total number of cycles logged by user' })
  totalCyclesLogged: number;

  @ApiProperty({ example: 32, description: 'Longest cycle recorded' })
  longestCycle: number;

  @ApiProperty({ example: 26, description: 'Shortest cycle recorded' })
  shortestCycle: number;
}

class RecentTrendsDto {
  @ApiProperty({ example: [28, 29, 28], description: 'List of last 6 cycle lengths' })
  cycleLengths: number[];

  @ApiProperty({ example: [5, 4, 5], description: 'List of last 6 period lengths' })
  periodLengths: number[];

  @ApiProperty({ example: ['2025-01-01', '2025-02-01'], description: 'Start dates of the last 6 cycles' })
  dates: string[];
}

class TopSymptomDto {
  @ApiProperty({ example: 'cramps' })
  symptomType: string;

  @ApiProperty({ example: 3, description: 'Frequency of this symptom in the current cycle' })
  count: number;

  @ApiProperty({ example: 2.5, description: 'Average severity of this symptom (1-5)' })
  avgSeverity: number;
}

class CurrentCycleInsightsDto {
  @ApiProperty({ example: 2.1, nullable: true })
  avgStress: number | null;

  @ApiProperty({ example: 4.5, nullable: true })
  avgEnergy: number | null;

  @ApiProperty({ example: 3.8, nullable: true })
  avgMood: number | null;

  @ApiProperty({ example: 36.5, nullable: true })
  avgBBT: number | null;

  @ApiProperty({ example: 2.0, nullable: true })
  avgLibido: number | null;

  @ApiProperty({ example: 2, description: 'Days with egg-white cervical mucus' })
  eggWhiteMucusDays: number;

  @ApiProperty({ example: 0, description: 'Days medication was logged' })
  totalMedicationDays: number;

  @ApiProperty({ example: 0.95, description: 'Percentage of days contraceptive was taken' })
  contraceptiveConsistency: number;

  @ApiProperty({ example: 0, description: 'Days with high stress (>= 4)' })
  highStressDays: number;

  @ApiProperty({ example: false })
  bbtShiftDetected: boolean;

  @ApiProperty({ example: '2026-03-15', nullable: true })
  bbtShiftDate: Date | null;

  @ApiProperty({ type: [TopSymptomDto] })
  topSymptoms: TopSymptomDto[];
}

class DataStatusDto {
  @ApiProperty({ example: true, description: 'True if results are estimated forward due to logging gaps' })
  isEstimated: boolean;

  @ApiProperty({ example: '2025-08-01', description: 'The last date the user actually logged a period start' })
  lastLoggedDate: string;

  @ApiProperty({ example: 8, description: 'How many cycles were estimated to reach today' })
  estimatedCyclesForward: number;
}

class ReportResponseDtoData {
  @ApiProperty({ type: CycleSummaryDto, nullable: true })
  summary: CycleSummaryDto | null;

  @ApiProperty({ type: RecentTrendsDto, nullable: true })
  recentTrends: RecentTrendsDto | null;

  @ApiProperty({ type: CurrentCycleInsightsDto, nullable: true })
  currentCycleInsights: CurrentCycleInsightsDto | null;

  @ApiProperty({ type: DataStatusDto })
  dataStatus: DataStatusDto;
}

import { BaseResponseDto } from 'src/shared/dto/baseResponse.dto';

export class ReportResponseDto extends BaseResponseDto {
  @ApiProperty({ type: ReportResponseDtoData })
  data: ReportResponseDtoData;
}
