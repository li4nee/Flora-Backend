import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, MinLength, MaxLength } from 'class-validator';

export class UserUpdateProfileDto {
  @ApiProperty({
    example: 'Arjun',
    description: 'First name of the user',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    example: 'Drake',
    description: 'Last name of the user',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    example: 28,
    description: 'Average cycle length in days',
  })
  @IsOptional()
  @IsInt()
  averageCycleLength?: number;

  @ApiProperty({
    example: 5,
    description: 'Average period length in days',
  })
  @IsOptional()
  @IsInt()
  averagePeriodLength?: number;

  @ApiProperty({
    example: '1995-08-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
