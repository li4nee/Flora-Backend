import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO to update user email
 */
export class UserUpdateEmailDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address the user wants to update to',
  })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({
    example: '1234567890drake',
    description: 'User current password for verification',
  })
  @IsString()
  currentPassword!: string;
}

/**
 * DTO to update user password
 */
export class UserUpdatePasswordDto {
  @ApiProperty({
    example: '1234567890drake',
    description: 'User current password',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: '1234567890Drake@',
    description:
      'New password with minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
  })
  newPassword!: string;
}

export class UpdateUserDto {}
