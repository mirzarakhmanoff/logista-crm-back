import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiParam, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get quick summary for dashboard cards' })
  async getSummary(@CurrentUser() user: any) {
    return this.dashboardService.getSummary(user.companyId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get request statistics by type and status' })
  async getStats(@CurrentUser() user: any) {
    return this.dashboardService.getRequestStats(user.companyId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive statistics for all entities' })
  async getFullStatistics(@CurrentUser() user: any) {
    return this.dashboardService.getFullStatistics(user.companyId);
  }

  @Get('statistics/range')
  @ApiOperation({ summary: 'Get statistics for a specific date range' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO format)', example: '2024-12-31' })
  async getStatisticsByRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return this.dashboardService.getStatisticsByDateRange(start, end, user.companyId);
  }

  @Get('statistics/manager/:managerId')
  @ApiOperation({ summary: 'Get statistics for a specific manager' })
  @ApiParam({ name: 'managerId', description: 'Manager user ID' })
  async getManagerStatistics(@Param('managerId') managerId: string, @CurrentUser() user: any) {
    return this.dashboardService.getManagerStatistics(managerId, user.companyId);
  }
}
