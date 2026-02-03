import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentStatus } from './schemas/shipment.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Request } from '../requests/schemas/request.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createDto: CreateShipmentDto, createdById: string): Promise<Shipment> {
    const request = await this.requestModel.findById(createDto.requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${createDto.requestId} not found`);
    }

    const shipment = new this.shipmentModel({
      ...createDto,
      createdBy: createdById,
    });

    const savedShipment = await shipment.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Shipment created${createDto.shipmentNo ? `: ${createDto.shipmentNo}` : ''}`,
      userId: createdById,
    });

    this.socketGateway.emitToAll('shipmentCreated', savedShipment);

    return savedShipment;
  }

  async findByRequest(requestId: string): Promise<Shipment[]> {
    return this.shipmentModel
      .find({ requestId: new Types.ObjectId(requestId), isArchived: { $ne: true } })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.shipmentModel
      .findById(id)
      .populate('requestId')
      .populate('createdBy', 'fullName email')
      .exec();

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async update(id: string, updateDto: UpdateShipmentDto, userId: string): Promise<Shipment> {
    const shipment = await this.shipmentModel.findById(id).exec();
    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    // Handle actual dates based on status changes
    if (updateDto.status === ShipmentStatus.IN_TRANSIT && !shipment.actualDepartureDate) {
      updateDto['actualDepartureDate'] = new Date();
    }
    if (updateDto.status === ShipmentStatus.DELIVERED && !shipment.actualArrivalDate) {
      updateDto['actualArrivalDate'] = new Date();
    }

    Object.assign(shipment, updateDto);
    const savedShipment = await shipment.save();

    const populatedShipment = await this.findOne(id);

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: shipment.requestId.toString(),
      action: 'updated',
      message: `Shipment updated${updateDto.status ? `, status: ${updateDto.status}` : ''}`,
      userId,
    });

    this.socketGateway.emitToAll('shipmentUpdated', populatedShipment);

    return populatedShipment;
  }

  async getInTransit(): Promise<Shipment[]> {
    return this.shipmentModel
      .find({ status: ShipmentStatus.IN_TRANSIT, isArchived: { $ne: true } })
      .populate('requestId')
      .populate('createdBy', 'fullName email')
      .sort({ departureDate: 1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.shipmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('shipmentDeleted', { shipmentId: id });
  }
}
