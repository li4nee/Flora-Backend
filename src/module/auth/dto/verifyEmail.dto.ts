import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'arjun@drake.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP sent to email' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}
