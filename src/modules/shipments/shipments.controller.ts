import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('requests/:requestId/shipments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateShipmentDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.create(
      { ...createDto, requestId },
      user.userId,
    );
  }

  @Get('requests/:requestId/shipments')
  async findByRequest(@Param('requestId') requestId: string) {
    return this.shipmentsService.findByRequest(requestId);
  }

  @Get('shipments/in-transit')
  async getInTransit() {
    return this.shipmentsService.getInTransit();
  }

  @Get('shipments/:id')
  async findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch('shipments/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.update(id, updateDto, user.userId);
  }

  @Delete('shipments/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.shipmentsService.remove(id);
  }
}
