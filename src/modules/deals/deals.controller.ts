import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { FilterDealDto } from './dto/filter-deal.dto';
import { UpdateDealStageDto } from './dto/update-stage.dto';
import { MoveDealKanbanDto, ReorderDealsDto } from './dto/kanban.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DealStage } from './schemas/deal.schema';

@ApiTags('Deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({
    status: 201,
    description: 'Deal created successfully',
  })
  async create(
    @Body() createDealDto: CreateDealDto,
    @CurrentUser() user: any,
  ) {
    return this.dealsService.create(createDealDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deals with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of deals',
  })
  async findAll(@Query() filterDto: FilterDealDto) {
    return this.dealsService.findAll(filterDto);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Get deals grouped by stage for Kanban view' })
  @ApiResponse({
    status: 200,
    description: 'Deals grouped by pipeline stage',
  })
  async getKanbanView() {
    return this.dealsService.getKanbanView();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get deal statistics' })
  @ApiResponse({
    status: 200,
    description: 'Deal statistics',
  })
  async getStats() {
    return this.dealsService.getDealStats();
  }

  @Get('pipeline-stats')
  @ApiOperation({ summary: 'Get pipeline statistics (count and amount per stage)' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline statistics',
  })
  async getPipelineStats() {
    return this.dealsService.getPipelineStats();
  }

  @Get('by-stage/:stage')
  @ApiOperation({ summary: 'Get deals by pipeline stage' })
  @ApiResponse({
    status: 200,
    description: 'Deals filtered by stage',
  })
  async getByStage(@Param('stage') stage: DealStage) {
    return this.dealsService.getDealsByStage(stage);
  }

  @Get('by-client/:clientId')
  @ApiOperation({ summary: 'Get deals by client ID' })
  @ApiResponse({
    status: 200,
    description: 'Deals for the specified client',
  })
  async getByClient(@Param('clientId') clientId: string) {
    return this.dealsService.findByClient(clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by ID' })
  @ApiResponse({
    status: 200,
    description: 'Deal details',
  })
  @ApiResponse({
    status: 404,
    description: 'Deal not found',
  })
  async findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Update deal by ID' })
  @ApiResponse({
    status: 200,
    description: 'Deal updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Deal not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDealDto: UpdateDealDto,
    @CurrentUser() user: any,
  ) {
    return this.dealsService.update(id, updateDealDto, user.userId);
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Update deal pipeline stage' })
  @ApiResponse({
    status: 200,
    description: 'Deal stage updated successfully',
  })
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateDealStageDto,
    @CurrentUser() user: any,
  ) {
    return this.dealsService.updateStage(id, updateStageDto, user.userId);
  }

  @Patch(':id/kanban-move')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Move deal in Kanban board (change stage and position)' })
  @ApiResponse({
    status: 200,
    description: 'Deal moved successfully',
  })
  async moveDealKanban(
    @Param('id') id: string,
    @Body() moveDealDto: MoveDealKanbanDto,
    @CurrentUser() user: any,
  ) {
    return this.dealsService.moveDealKanban(id, moveDealDto, user.userId);
  }

  @Patch('reorder')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Reorder deals within a stage' })
  @ApiResponse({
    status: 200,
    description: 'Deals reordered successfully',
  })
  async reorderDeals(@Body() reorderDto: ReorderDealsDto) {
    await this.dealsService.reorderDeals(reorderDto);
    return { success: true };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deal by ID (Admin/Manager only)' })
  @ApiResponse({
    status: 204,
    description: 'Deal deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Deal not found',
  })
  async remove(@Param('id') id: string) {
    await this.dealsService.remove(id);
  }
}
