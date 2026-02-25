import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthRegisterProfileDto } from './registerProfile.dto';

export class AuthRegisterDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'Password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ type: AuthRegisterProfileDto, description: 'User profile data' })
  @ValidateNested()
  @Type(() => AuthRegisterProfileDto)
  profile!: AuthRegisterProfileDto;
}
