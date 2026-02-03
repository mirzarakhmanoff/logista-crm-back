import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiParam, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get quick summary for dashboard cards' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get request statistics by type and status' })
  async getStats() {
    return this.dashboardService.getRequestStats();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive statistics for all entities' })
  async getFullStatistics() {
    return this.dashboardService.getFullStatistics();
  }

  @Get('statistics/range')
  @ApiOperation({ summary: 'Get statistics for a specific date range' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO format)', example: '2024-12-31' })
  async getStatisticsByRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return this.dashboardService.getStatisticsByDateRange(start, end);
  }

  @Get('statistics/manager/:managerId')
  @ApiOperation({ summary: 'Get statistics for a specific manager' })
  @ApiParam({ name: 'managerId', description: 'Manager user ID' })
  async getManagerStatistics(@Param('managerId') managerId: string) {
    return this.dashboardService.getManagerStatistics(managerId);
  }
}
