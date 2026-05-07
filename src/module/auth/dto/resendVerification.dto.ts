import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'arjun@drake.com', description: 'User email address' })
  @IsEmail()
  email!: string;
}
