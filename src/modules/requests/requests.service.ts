import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request } from './schemas/request.schema';
import { Client } from '../clients/schemas/client.schema';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { FilterRequestDto } from './dto/filter-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { RequestStatusesService } from '../request-statuses/request-statuses.service';
import { RequestType, RequestStatus } from '../request-statuses/schemas/request-status.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private statusesService: RequestStatusesService,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createDto: CreateRequestDto, createdById: string): Promise<Request> {
    const client = await this.clientModel.findById(createDto.clientId).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID ${createDto.clientId} not found`);
    }

    const defaultStatusKey = await this.statusesService.getDefaultStatusKey(createDto.type);

    const maxPositionRequest = await this.requestModel
      .findOne({ type: createDto.type, statusKey: defaultStatusKey })
      .sort({ position: -1 })
      .exec();
    const position = (maxPositionRequest?.position || 0) + 1;

    const request = new this.requestModel({
      ...createDto,
      statusKey: defaultStatusKey,
      createdBy: createdById,
      position,
    });

    const savedRequest = await request.save();

    const populatedRequest = await this.findOne(savedRequest._id.toString());

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: savedRequest._id.toString(),
      action: 'created',
      message: `Request created`,
      userId: createdById,
    });

    this.socketGateway.emitToAll('requestCreated', populatedRequest);

    return populatedRequest;
  }

  async findAll(filterDto: FilterRequestDto): Promise<{ data: Request[]; total: number; page: number; limit: number }> {
    const query: any = {};
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.statusKey) query.statusKey = filterDto.statusKey;
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;

    if (filterDto.search) {
      const clients = await this.clientModel
        .find({
          $or: [
            { name: { $regex: filterDto.search, $options: 'i' } },
            { company: { $regex: filterDto.search, $options: 'i' } },
            { phone: { $regex: filterDto.search, $options: 'i' } },
          ],
        })
        .select('_id')
        .exec();
      query.clientId = { $in: clients.map(c => c._id) };
    }

    const [data, total] = await Promise.all([
      this.requestModel
        .find(query)
        .populate('clientId', 'name company phone email')
        .populate('assignedTo', 'fullName email')
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Request> {
    const request = await this.requestModel
      .findById(id)
      .populate('clientId')
      .populate('assignedTo', 'fullName email phone')
      .populate('createdBy', 'fullName email phone')
      .exec();

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async getRequestDetail(id: string): Promise<any> {
    const request = await this.findOne(id);
    const activities = await this.activityLogsService.findByEntity('REQUEST', id);

    return {
      request,
      client: request.clientId,
      activity: activities,
    };
  }

  async update(id: string, updateDto: UpdateRequestDto, userId: string): Promise<Request> {
    const request = await this.requestModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate('clientId', 'name company phone email')
      .populate('assignedTo', 'fullName email')
      .populate('createdBy', 'fullName email')
      .exec();

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: id,
      action: 'updated',
      message: 'Request updated',
      userId,
    });

    this.socketGateway.emitToAll('requestUpdated', request);

    return request;
  }

  async updateStatus(id: string, toKey: string, userId: string): Promise<Request> {
    const request = await this.requestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const isValid = await this.statusesService.isValidTransition(
      request.type as RequestType,
      request.statusKey,
      toKey,
    );

    if (!isValid) {
      throw new BadRequestException(`Invalid status transition from ${request.statusKey} to ${toKey}`);
    }

    const maxPositionRequest = await this.requestModel
      .findOne({ type: request.type, statusKey: toKey })
      .sort({ position: -1 })
      .exec();
    const position = (maxPositionRequest?.position || 0) + 1;

    const oldStatus = request.statusKey;
    request.statusKey = toKey;
    request.position = position;
    await request.save();

    const populatedRequest = await this.findOne(id);

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: id,
      action: 'status_changed',
      message: `Status changed from ${oldStatus} to ${toKey}`,
      userId,
    });

    this.socketGateway.emitToAll('requestStatusChanged', {
      request: populatedRequest,
      fromStatus: oldStatus,
      toStatus: toKey,
    });

    return populatedRequest;
  }

  async moveRequest(id: string, moveDto: MoveRequestDto, userId: string): Promise<Request> {
    const request = await this.requestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const oldStatus = request.statusKey;
    const isStatusChange = oldStatus !== moveDto.toStatusKey;

    if (isStatusChange) {
      const isValid = await this.statusesService.isValidTransition(
        request.type as RequestType,
        request.statusKey,
        moveDto.toStatusKey,
      );

      if (!isValid) {
        throw new BadRequestException(`Invalid status transition from ${request.statusKey} to ${moveDto.toStatusKey}`);
      }
    }

    request.statusKey = moveDto.toStatusKey;
    if (moveDto.position !== undefined) {
      request.position = moveDto.position;
    }
    await request.save();

    const populatedRequest = await this.findOne(id);

    if (isStatusChange) {
      await this.activityLogsService.log({
        entityType: 'REQUEST',
        entityId: id,
        action: 'status_changed',
        message: `Status changed from ${oldStatus} to ${moveDto.toStatusKey}`,
        userId,
      });
    }

    this.socketGateway.emitToAll('requestMoved', {
      request: populatedRequest,
      fromStatus: oldStatus,
      toStatus: moveDto.toStatusKey,
    });

    return populatedRequest;
  }

  async getKanban(type: RequestType): Promise<any> {
    const statuses = await this.statusesService.findAll(type);

    const requests = await this.requestModel
      .find({ type })
      .populate('clientId', 'name company phone email')
      .populate('assignedTo', 'fullName email')
      .sort({ position: 1 })
      .exec();

    const columns = statuses.map(s => ({
      key: s.key,
      title: s.title,
      order: s.order,
      isFinal: s.isFinal,
    }));

    const itemsByStatus: Record<string, any[]> = {};
    for (const status of statuses) {
      itemsByStatus[status.key] = [];
    }

    for (const request of requests) {
      if (itemsByStatus[request.statusKey]) {
        itemsByStatus[request.statusKey].push({
          _id: request._id,
          type: request.type,
          statusKey: request.statusKey,
          source: request.source,
          comment: request.comment,
          client: request.clientId,
          assignedTo: request.assignedTo,
          position: request.position,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        });
      }
    }

    return { columns, itemsByStatus };
  }

  async findByClient(clientId: string): Promise<Request[]> {
    return this.requestModel
      .find({ clientId })
      .populate('assignedTo', 'fullName email')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.requestModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('requestDeleted', { requestId: id });
  }
}
