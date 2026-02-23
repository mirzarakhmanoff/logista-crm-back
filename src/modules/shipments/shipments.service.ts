import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentStatus } from './schemas/shipment.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Request } from '../requests/schemas/request.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateShipmentDto, createdById: string, companyId: string): Promise<Shipment> {
    const request = await this.requestModel.findById(createDto.requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${createDto.requestId} not found`);
    }

    const shipment = new this.shipmentModel({
      ...createDto,
      createdBy: createdById,
      companyId: new Types.ObjectId(companyId),
    });

    const savedShipment = await shipment.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Shipment created${createDto.shipmentNo ? `: ${createDto.shipmentNo}` : ''}`,
      userId: createdById,
      companyId,
    });

    this.socketGateway.emitToCompany(companyId, 'shipmentCreated', savedShipment);

    this.notificationsService.create({
      type: NotificationType.SHIPMENT_CREATED,
      title: 'Новая отправка',
      message: `Создана новая отправка${createDto.shipmentNo ? `: ${createDto.shipmentNo}` : ''}`,
      entityType: 'SHIPMENT',
      entityId: savedShipment._id.toString(),
      createdBy: createdById,
    });

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
      companyId: shipment.companyId?.toString(),
    });

    this.socketGateway.emitToCompany(shipment.companyId?.toString(), 'shipmentUpdated', populatedShipment);

    this.notificationsService.create({
      type: NotificationType.SHIPMENT_UPDATED,
      title: 'Отправка обновлена',
      message: `Отправка обновлена${updateDto.status ? `, статус: ${updateDto.status}` : ''}`,
      entityType: 'SHIPMENT',
      entityId: id,
      createdBy: userId,
    });

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
    const shipment = await this.shipmentModel.findById(id).exec();
    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }
    const companyId = shipment.companyId?.toString();
    await this.shipmentModel.findByIdAndDelete(id).exec();
    this.socketGateway.emitToCompany(companyId, 'shipmentDeleted', { shipmentId: id });
  }
}
