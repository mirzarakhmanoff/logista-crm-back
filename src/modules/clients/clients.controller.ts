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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({
    status: 201,
    description: 'Client created successfully',
  })
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.create(createClientDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of clients',
  })
  async findAll(@Query() filterDto: FilterClientDto) {
    return this.clientsService.findAll(filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get client statistics' })
  @ApiResponse({
    status: 200,
    description: 'Client statistics',
  })
  async getStats() {
    return this.clientsService.getClientStats();
  }

  @Get(':id/deals')
  @ApiOperation({ summary: 'Get all deals for a client' })
  @ApiResponse({
    status: 200,
    description: 'List of client deals',
  })
  async getClientDeals(@Param('id') id: string) {
    return this.clientsService.getClientDeals(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiResponse({
    status: 200,
    description: 'Client details',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Update client by ID' })
  @ApiResponse({
    status: 200,
    description: 'Client updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete client by ID (Admin/Manager only)' })
  @ApiResponse({
    status: 204,
    description: 'Client deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  async remove(@Param('id') id: string) {
    await this.clientsService.remove(id);
  }
}
