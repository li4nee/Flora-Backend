import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get a summary report for the current user' })
  async getMyReport(@CurrentUserId() userId: string) {
    return await this.reportsService.getUserReport(userId);
  }
}
