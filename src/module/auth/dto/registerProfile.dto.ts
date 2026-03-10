import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MinLength, IsInt } from 'class-validator';

export class AuthRegisterProfileDto {
  @ApiProperty({ example: 'Arjun', description: 'First name of the user', minLength: 2 })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Drake', description: 'Last name of the user', minLength: 2 })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional({ example: '2000-06-09', description: 'Date of birth of the user', type: String })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 28, description: 'Average cycle length in days', type: Number })
  @IsInt()
  @IsOptional()
  averageCycleLength?: number;

  @ApiPropertyOptional({ example: 5, description: 'Average period length in days', type: Number })
  @IsInt()
  @IsOptional()
  averagePeriodLength?: number;
}
