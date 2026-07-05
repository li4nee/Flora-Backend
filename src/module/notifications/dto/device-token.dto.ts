import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    example: 'dXjK3...:APA91bF...',
    description: 'The FCM registration token obtained from the client SDK',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'android',
    description: 'The platform the token was issued on',
    enum: ['ios', 'android', 'web'],
    required: false,
  })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;
}

export class UnregisterDeviceTokenDto {
  @ApiProperty({
    example: 'dXjK3...:APA91bF...',
    description: 'The FCM registration token to remove (e.g. on logout)',
  })
  @IsString()
  token!: string;
}
