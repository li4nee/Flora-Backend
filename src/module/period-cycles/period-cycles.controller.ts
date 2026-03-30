import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PeriodCyclesService } from './period-cycles.service';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { ApiBearerAuth, ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PeriodCycleStartLogDto } from './dto/periodCycleStart.dto';
import { PeriodCycleEndLogDto } from './dto/periodCycleEnd.dto';
import { PeriodCycleHistoryGetDto } from './dto/periodCycleHistoryGet.dto';
import { InvalidInputError } from 'src/shared/typings/error.typings';

@ApiTags('Period Cycles')
@Controller('period-cycles')
export class PeriodCyclesController {
  constructor(private readonly periodCyclesService: PeriodCyclesService) {}

  @Post('/period/start')
  @ApiOperation({ summary: "Log in the period's start" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logStart(@CurrentUserId() userId: string, @Body() dto: PeriodCycleStartLogDto) {
    const result = await this.periodCyclesService.logPeriodStart(userId, dto);
    return { message: "Period's start logged successfully", data: result };
  }

  @Patch('/period/:id/end')
  @ApiOperation({ summary: 'Log the end of the period' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logEnd(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PeriodCycleEndLogDto) {
    const { periodEndDate, notes } = dto;
    if (!id) {
      throw new InvalidInputError('Period cycle ID is required to log the end of the cycle.');
    }
    const result = await this.periodCyclesService.logPeriodEnd(userId, id, periodEndDate, notes);
    return { message: 'Period cycle end logged successfully', data: result };
  }

  @Get('/history')
  @ApiOperation({ summary: 'Get the history of the period cycles in an paginated reponse.' })
  @ApiBearerAuth()
  @ApiExtraModels(PeriodCycleHistoryGetDto)
  @UseGuards(JwtAuthGuard)
  async getHistory(@CurrentUserId() userId: string, @Query() dto: PeriodCycleHistoryGetDto) {
    const result = await this.periodCyclesService.getCycleHistory(userId, dto);
    return { message: 'Period cycle history retrieved successfully', data: result.data, meta: result.meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the details of a specific period cycle.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getCycle(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    if (!id) {
      throw new InvalidInputError('Period cycle ID is required to retrieve details.');
    }
    const result = await this.periodCyclesService.findPeriodCycleById(userId, id);
    if (!result) {
      throw new InvalidInputError('No period cycle found with the given ID for this user.');
    }
    return { message: 'Period cycle details retrieved successfully', data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the history of the period cycle.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async delete(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    if (!id) {
      throw new InvalidInputError('Period cycle ID is required to delete the cycle.');
    }
    await this.periodCyclesService.deleteCycle(userId, id);
    return { message: 'Period cycle deleted successfully' };
  }
}
