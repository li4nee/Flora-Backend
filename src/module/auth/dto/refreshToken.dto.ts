import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'some-refresh-token', description: 'The refresh token string' })
  @IsString()
  refreshToken!: string;
}
