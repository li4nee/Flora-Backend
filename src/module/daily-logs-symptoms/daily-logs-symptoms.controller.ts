import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwtAuth.guard';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DailyLogsAndSymptomsService } from './daily-logs-symptoms.service';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { DailyLogCreateDto } from './dto/createDailyLog.dto';
import { DailyLogQueryDto } from './dto/queryDailyLog.dto';
import { DailyLogUpdateDto } from './dto/updateDailyLog.dto';
import { InvalidInputError } from 'src/shared/typings/error.typings';

@UseGuards(JwtAuthGuard)
@ApiTags('Daily Logs')
@Controller('daily-logs')
@ApiBearerAuth()
export class DailyLogsAndSymptomsController {
  constructor(private readonly dailyLogService: DailyLogsAndSymptomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new daily log with symtoms(optional)' })
  @ApiCreatedResponse({ description: 'Daily log created successfully' })
  @ApiConflictResponse({ description: 'Log already exists for this user on this date' })
  async create(@Body() dto: DailyLogCreateDto, @CurrentUserId() userId: string) {
    const result = await this.dailyLogService.createDailyLogsAndSymptoms(dto, userId);
    return { message: 'Daily log created successfully', data: result };
  }

  @Get()
  @ApiOperation({
    summary:
      'List daily logs for authenticated user. Has tons of query parameter that can do the searching , filtering and sorting',
  })
  @ApiExtraModels(DailyLogQueryDto)
  findAll(@Query() query: DailyLogQueryDto, @CurrentUserId() userId: string) {
    return this.dailyLogService.findDailyLogsByQuery(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a daily log by ID' })
  @ApiOkResponse({ description: 'Daily log retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Daily log not found or unauthorized' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    if (!id) {
      throw new InvalidInputError('ID parameter is required and must be a valid UUID');
    }
    const result = await this.dailyLogService.findDailyLogById(id, userId, { dailySymptoms: true, periodCycle: true });
    if (!result) {
      throw new InvalidInputError('Daily log not found or unauthorized');
    }
    return { message: 'Daily log retrieved successfully', data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily log' })
  @ApiOkResponse({ description: 'Daily log updated successfully' })
  @ApiNotFoundResponse({ description: 'Daily log not found or unauthorized' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DailyLogUpdateDto, @CurrentUserId() userId: string) {
    if (!id) {
      throw new InvalidInputError('ID parameter is required and must be a valid UUID');
    }
    const result = await this.dailyLogService.updateDailyLog(id, dto, userId);
    if (!result) {
      throw new InvalidInputError('Daily log not found or unauthorized');
    }
    return { message: 'Daily log updated successfully', data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily log' })
  @ApiNoContentResponse({ description: 'Daily log deleted successfully' })
  @ApiNotFoundResponse({ description: 'Daily log not found or unauthorized' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    if (!id) {
      throw new InvalidInputError('ID parameter is required and must be a valid UUID');
    }
    await this.dailyLogService.removeDailyLog(id, userId);
    return { message: 'Daily log deleted successfully' };
  }
}
