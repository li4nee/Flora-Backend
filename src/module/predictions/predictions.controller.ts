import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from '../../shared/decorators/currentUserId.decorators';
import { PredictionsService } from './predictions.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PredictionResponseDto } from './dto/predictionResponse.dto';

@ApiTags('Predictions')
@Controller('predictions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get cycle predictions for the current user' })
  @ApiOkResponse({
    type: PredictionResponseDto,
    description: 'Returns the predicted cycle status and current day metrics.',
  })
  async getPrediction(@CurrentUserId() userId: string) {
    return await this.predictionsService.getPredictionForUser(userId);
  }
}
