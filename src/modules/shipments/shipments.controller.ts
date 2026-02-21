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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('requests/:requestId/shipments')
  @Permissions('shipments.create')
  async create(
    @Param('requestId') requestId: string,
    @Body() createDto: Omit<CreateShipmentDto, 'requestId'>,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.create(
      { ...createDto, requestId },
      user.userId || user.sub,
      user.companyId,
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
  @Permissions('shipments.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateShipmentDto,
    @CurrentUser() user: any,
  ) {
    return this.shipmentsService.update(id, updateDto, user.userId);
  }

  @Delete('shipments/:id')
  @Permissions('shipments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.shipmentsService.remove(id);
  }
}
