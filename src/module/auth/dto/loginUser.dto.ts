import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthLoginDto {
  @ApiProperty({
    example: 'arjun@drake.com',
    description: 'User email address',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '1234567890Drake@',
    description: 'User password',
    minLength: 6,
    required: true,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
