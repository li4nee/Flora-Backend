import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from '../../shared/decorators/currentUserId.decorators';
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

  @Get('me/pdf')
  @ApiOperation({ summary: 'Export a professional PDF health report' })
  async exportMyReportPdf(@CurrentUserId() userId: string, @Res() res: Response) {
    const pdfBuffer = await this.reportsService.generatePdfReport(userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Flora_Health_Report.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
