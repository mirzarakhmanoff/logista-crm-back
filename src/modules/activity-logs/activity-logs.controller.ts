import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogsService.findByEntity(entityType, entityId, limit);
  }

  @Get('recent')
  async findRecent(@Query('limit') limit?: number) {
    return this.activityLogsService.findRecent(limit);
  }
}
