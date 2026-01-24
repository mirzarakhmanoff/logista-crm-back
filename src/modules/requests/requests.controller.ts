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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterRequestDto } from './dto/filter-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { RequestType } from '../request-statuses/schemas/request-status.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async create(
    @Body() createDto: CreateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.create(createDto, user.userId);
  }

  @Get()
  async findAll(@Query() filterDto: FilterRequestDto) {
    return this.requestsService.findAll(filterDto);
  }

  @Get('kanban')
  async getKanban(@Query('type') type: RequestType) {
    return this.requestsService.getKanban(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Get(':id/detail')
  async getDetail(@Param('id') id: string) {
    return this.requestsService.getRequestDetail(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.update(id, updateDto, user.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.updateStatus(id, updateStatusDto.toKey, user.userId);
  }

  @Patch(':id/move')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async moveRequest(
    @Param('id') id: string,
    @Body() moveDto: MoveRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.moveRequest(id, moveDto, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.requestsService.remove(id);
  }
}
