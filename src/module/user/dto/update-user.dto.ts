import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO to update user email
 */
export class UpdateEmailDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address the user wants to update to',
  })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({
    example: 'currentPassword123',
    description: 'User current password for verification',
  })
  @IsString()
  currentPassword!: string;
}

/**
 * DTO to update user password
 */
export class UpdatePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'User current password',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'newSecurePassword123',
    description: 'New password with minimum 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class UpdateUserDto {}
