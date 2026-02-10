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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { ClientType } from './schemas/client.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestsService } from '../requests/requests.service';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly requestsService: RequestsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.create(createClientDto, user.userId);
  }

  @Get()
  async findAllClients(@Query() filterDto: FilterClientDto) {
    return this.clientsService.findAll({ ...filterDto, type: ClientType.CLIENT });
  }

  @Get('agents')
  async findAllAgents(@Query() filterDto: FilterClientDto) {
    return this.clientsService.findAll({ ...filterDto, type: ClientType.AGENT });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOneWithAllRelations(id);
  }

  @Get(':id/requests')
  async getClientRequests(@Param('id') id: string) {
    await this.clientsService.findOne(id);
    return this.requestsService.findByClient(id);
  }

  @Get(':id/basic')
  async findOneBasic(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.update(id, updateClientDto, user.userId);
  }

  @Post(':id/avatar')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clientsService.updateAvatar(id, file.path);
  }

  @Delete(':id/avatar')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async removeAvatar(@Param('id') id: string) {
    return this.clientsService.removeAvatar(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.clientsService.remove(id);
  }
}
