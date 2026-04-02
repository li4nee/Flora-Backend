import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportResponseDto } from './dto/reportResponse.dto';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get a summary report for the current user' })
  @ApiOkResponse({
    type: ReportResponseDto,
    description: 'Returns historical stats and current cycle insights.',
  })
  async getMyReport(@CurrentUserId() userId: string) {
    return await this.reportsService.getUserReport(userId);
  }
}
