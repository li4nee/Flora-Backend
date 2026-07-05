import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'arjun@drake.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP sent to email' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;

  @ApiProperty({
    example: 'NewSecure1@Pass',
    description: 'New password (min 8 chars, must include uppercase, lowercase, number, and special character)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
  })
  newPassword!: string;
}
