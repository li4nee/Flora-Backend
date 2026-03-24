import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
//   @Get()
//   async getPrediction(@CurrentUserId() userId: string) {

//   }
}
