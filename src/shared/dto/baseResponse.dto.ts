import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({ example: '2026-04-02T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/...' })
  path: string;
}
