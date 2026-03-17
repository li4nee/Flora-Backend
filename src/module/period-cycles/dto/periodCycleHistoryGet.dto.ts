import { IsOptional, IsInt, IsDateString, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { SortOrder } from 'src/shared/typings/base.typings';

export class PeriodCycleFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  periodCycleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycleLengthMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycleLengthMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodLengthMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodLengthMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notesSearch?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}

export class PeriodCycleHistoryGetDto extends IntersectionType(PeriodCycleFilterDto, PaginationDto) {}
