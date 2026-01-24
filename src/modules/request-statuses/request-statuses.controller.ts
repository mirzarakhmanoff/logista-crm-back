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
import { RequestStatusesService } from './request-statuses.service';
import { CreateRequestStatusDto } from './dto/create-request-status.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestType } from './schemas/request-status.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Request Statuses')
@ApiBearerAuth()
@Controller('request-statuses')
export class RequestStatusesController {
  constructor(private readonly statusesService: RequestStatusesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: CreateRequestStatusDto) {
    return this.statusesService.create(createDto);
  }

  @Get()
  async findAll(@Query('type') type?: RequestType) {
    return this.statusesService.findAll(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.statusesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequestStatusDto,
  ) {
    return this.statusesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.statusesService.remove(id);
  }

  @Post('seed')
  @Roles(UserRole.ADMIN)
  async seed() {
    await this.statusesService.seedDefaultStatuses();
    return { message: 'Default statuses seeded successfully' };
  }
}
