import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthRegisterProfileDto } from './registerProfile.dto';

export class AuthRegisterDto {
  @ApiProperty({ example: 'arjun@drake.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Drake@1234567890',
    description: 'Password (min 8 characters, must include uppercase, lowercase, number, and special character)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
  })
  password!: string;

  @ApiProperty({ type: AuthRegisterProfileDto, description: 'User profile data' })
  @ValidateNested()
  @Type(() => AuthRegisterProfileDto)
  profile!: AuthRegisterProfileDto;
}
