import { IsString, IsOptional, IsInt, IsDateString, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsInt()
  averageCycleLength?: number;

  @IsOptional()
  @IsInt()
  averagePeriodLength?: number;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
