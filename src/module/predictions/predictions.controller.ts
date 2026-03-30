import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { PredictionsService } from './predictions.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Predictions')
@Controller('predictions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get cycle predictions for the current user' })
  async getPrediction(@CurrentUserId() userId: string) {
    const prediction = await this.predictionsService.getPredictionForUser(userId);
    return {
      success: true,
      data: prediction,
    };
  }
}
