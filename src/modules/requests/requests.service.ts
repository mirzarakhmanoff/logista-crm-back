import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import {
  Request,
  RequestStatusKey,
  RequestType,
  REQUEST_STATUS_DEFINITIONS,
  REQUEST_STATUS_TRANSITIONS,
  RequestFile,
} from './schemas/request.schema';
import { Client, ClientType } from '../clients/schemas/client.schema';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { FilterRequestDto } from './dto/filter-request.dto';
import { MoveRequestDto } from './dto/move-request.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityLog } from '../activity-logs/schemas/activity-log.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
  ) {}

  private getStatusDefinitions(type: RequestType) {
    return REQUEST_STATUS_DEFINITIONS[type] ?? [];
  }

  private isValidStatus(type: RequestType, statusKey: RequestStatusKey): boolean {
    return this.getStatusDefinitions(type).some(status => status.key === statusKey);
  }

  private isValidTransition(type: RequestType, fromKey: RequestStatusKey, toKey: RequestStatusKey): boolean {
    const transitions = REQUEST_STATUS_TRANSITIONS[type] ?? {};
    const allowed = transitions[fromKey] ?? [];
    return allowed.includes(toKey);
  }

  private getClientTypeForRequestType(type: RequestType): ClientType {
    if (type === RequestType.NEW_AGENT || type === RequestType.OUR_AGENT) {
      return ClientType.AGENT;
    }
    return ClientType.CLIENT;
  }

  private generateClientNumber(clientType: ClientType = ClientType.CLIENT) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    const prefix = clientType === ClientType.AGENT ? 'AG' : 'CL';
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(createDto: CreateRequestDto, createdById: string): Promise<Request> {
    let resolvedClientId = createDto.clientId;
    const clientName = createDto.client?.trim();

    if (!resolvedClientId && clientName) {
      const clientType = this.getClientTypeForRequestType(createDto.type);
      const newClient = new this.clientModel({
        name: clientName,
        clientNumber: this.generateClientNumber(clientType),
        type: clientType,
        createdBy: createdById,
      });
      const savedClient = await newClient.save();
      resolvedClientId = savedClient._id.toString();
    }

    if (!resolvedClientId) {
      throw new BadRequestException('clientId or client is required');
    }

    const client = await this.clientModel.findById(resolvedClientId).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID ${resolvedClientId} not found`);
    }

    let statusKey: RequestStatusKey = RequestStatusKey.NEW;
    if (createDto.status) {
      if (!this.isValidStatus(createDto.type, createDto.status)) {
        throw new BadRequestException(`Invalid status key: ${createDto.status}`);
      }
      statusKey = createDto.status;
    } else if (!this.isValidStatus(createDto.type, statusKey)) {
      const fallback = this.getStatusDefinitions(createDto.type)[0];
      if (fallback) {
        statusKey = fallback.key;
      }
    }

    const maxPositionRequest = await this.requestModel
      .findOne({ type: createDto.type, statusKey })
      .sort({ position: -1 })
      .exec();
    const position = (maxPositionRequest?.position || 0) + 1;

    const managerValue = createDto.manager?.trim();
    const managerIsId = managerValue ? Types.ObjectId.isValid(managerValue) : false;

    const request = new this.requestModel({
      clientId: resolvedClientId,
      client: clientName,
      type: createDto.type,
      statusKey,
      source: createDto.source,
      comment: createDto.comment,
      cargoName: createDto.cargoName,
      route: createDto.route,
      weight: createDto.weight,
      volume: createDto.volume,
      amount: createDto.amount,
      deadline: createDto.deadline ? new Date(createDto.deadline) : undefined,
      paymentStatus: createDto.paymentStatus,
      createdBy: createdById,
      assignedTo: createDto.assignedTo ?? (managerIsId ? managerValue : undefined),
      manager: managerIsId ? undefined : managerValue,
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

    this.notificationsService.create({
      type: NotificationType.REQUEST_CREATED,
      title: 'Новая заявка',
      message: `Создана новая заявка: ${populatedRequest.cargoName || populatedRequest.route || ''}`,
      entityType: 'REQUEST',
      entityId: savedRequest._id.toString(),
      createdBy: createdById,
    });

    return populatedRequest;
  }

  async findAll(filterDto: FilterRequestDto): Promise<{ data: Request[]; total: number; page: number; limit: number }> {
    const query: any = {
      isArchived: { $ne: true },
    };
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
      query.$or = [
        { clientId: { $in: clients.map(c => c._id) } },
        { client: { $regex: filterDto.search, $options: 'i' } },
        { cargoName: { $regex: filterDto.search, $options: 'i' } },
        { route: { $regex: filterDto.search, $options: 'i' } },
      ];
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
    const managerValue = updateDto.manager?.trim();
    const managerIsId = managerValue ? Types.ObjectId.isValid(managerValue) : false;
    const updateData: any = {
      ...updateDto,
    };

    if (updateDto.deadline) {
      updateData.deadline = new Date(updateDto.deadline);
    }

    if (managerValue) {
      updateData.assignedTo = updateDto.assignedTo ?? (managerIsId ? managerValue : undefined);
      updateData.manager = managerIsId ? undefined : managerValue;
    }

    const request = await this.requestModel
      .findByIdAndUpdate(id, updateData, { new: true })
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

    this.notificationsService.create({
      type: NotificationType.REQUEST_UPDATED,
      title: 'Заявка обновлена',
      message: `Заявка обновлена`,
      entityType: 'REQUEST',
      entityId: id,
      createdBy: userId,
    });

    return request;
  }

  async updateStatus(id: string, toKey: RequestStatusKey, userId: string): Promise<Request> {
    const request = await this.requestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    const isValid = this.isValidTransition(
      request.type as RequestType,
      request.statusKey as RequestStatusKey,
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

    if (toKey === RequestStatusKey.COMPLETED) {
      request.isArchived = true;
      request.archivedAt = new Date();
      (request as any).archivedBy = new Types.ObjectId(userId);
    }

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

    this.notificationsService.create({
      type: NotificationType.REQUEST_STATUS_CHANGED,
      title: 'Статус заявки изменён',
      message: `Статус заявки изменён с ${oldStatus} на ${toKey}`,
      entityType: 'REQUEST',
      entityId: id,
      createdBy: userId,
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
      const isValid = this.isValidTransition(
        request.type as RequestType,
        request.statusKey as RequestStatusKey,
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

    if (moveDto.toStatusKey === RequestStatusKey.COMPLETED) {
      request.isArchived = true;
      request.archivedAt = new Date();
      (request as any).archivedBy = new Types.ObjectId(userId);
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

    if (isStatusChange) {
      this.notificationsService.create({
        type: NotificationType.REQUEST_STATUS_CHANGED,
        title: 'Статус заявки изменён',
        message: `Статус заявки изменён с ${oldStatus} на ${moveDto.toStatusKey}`,
        entityType: 'REQUEST',
        entityId: id,
        createdBy: userId,
      });
    }

    return populatedRequest;
  }

  async getKanban(type: RequestType): Promise<any> {
    const statuses = this.getStatusDefinitions(type);

    const [requests, completedRequests] = await Promise.all([
      this.requestModel
        .find({ type, isArchived: { $ne: true } })
        .populate('clientId', 'name company phone email')
        .populate('assignedTo', 'fullName email')
        .sort({ position: 1 })
        .exec(),
      this.requestModel
        .find({ type, statusKey: RequestStatusKey.COMPLETED, isArchived: true })
        .populate('clientId', 'name company phone email')
        .populate('assignedTo', 'fullName email')
        .sort({ archivedAt: -1 })
        .limit(3)
        .exec(),
    ]);

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

    const mapRequest = (request: any) => ({
      _id: request._id,
      type: request.type,
      statusKey: request.statusKey,
      source: request.source,
      comment: request.comment,
      cargoName: request.cargoName,
      route: request.route,
      weight: request.weight,
      volume: request.volume,
      amount: request.amount,
      deadline: request.deadline,
      paymentStatus: request.paymentStatus,
      client: request.clientId ?? request.client,
      assignedTo: request.assignedTo,
      manager: request.manager,
      position: request.position,
      isArchived: request.isArchived,
      archivedAt: request.archivedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });

    for (const request of requests) {
      if (itemsByStatus[request.statusKey]) {
        itemsByStatus[request.statusKey].push(mapRequest(request));
      }
    }

    itemsByStatus[RequestStatusKey.COMPLETED] = completedRequests.map(mapRequest);

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

  async addComment(requestId: string, dto: AddCommentDto, userId: string): Promise<ActivityLog> {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    const comment = await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: requestId,
      action: 'comment',
      message: dto.content,
      userId,
      metadata: { content: dto.content },
    });

    this.socketGateway.emitToAll('requestCommentAdded', {
      requestId,
      comment,
    });

    return comment;
  }

  async getComments(requestId: string): Promise<ActivityLog[]> {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    const activities = await this.activityLogsService.findByEntity('REQUEST', requestId);
    return activities.filter(a => a.action === 'comment');
  }

  async addFiles(
    requestId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<Request> {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    const now = new Date();
    const filesToAdd = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: now,
      uploadedBy: new Types.ObjectId(userId),
    }));

    const updatedRequest = await this.requestModel
      .findByIdAndUpdate(
        requestId,
        { $push: { files: { $each: filesToAdd } } },
        { new: true },
      )
      .populate('clientId', 'name company phone email')
      .populate('assignedTo', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('files.uploadedBy', 'fullName email')
      .exec();

    for (const file of files) {
      await this.activityLogsService.log({
        entityType: 'REQUEST',
        entityId: requestId,
        action: 'file_uploaded',
        message: `File uploaded: ${file.originalname}`,
        userId,
      });
    }

    this.socketGateway.emitToAll('requestFilesAdded', {
      requestId,
      files: filesToAdd,
    });

    return updatedRequest!;
  }

  async getFiles(requestId: string): Promise<RequestFile[]> {
    const request = await this.requestModel
      .findById(requestId)
      .populate('files.uploadedBy', 'fullName email')
      .exec();

    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    return request.files;
  }

  async getFile(requestId: string, fileId: string) {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    const file = request.files.find((f: any) => f._id.toString() === fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (!file.path || !fs.existsSync(file.path)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      filename: file.filename,
      originalName: file.originalName,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async removeFile(requestId: string, fileId: string, userId: string): Promise<Request> {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    const file = request.files.find((f: any) => f._id.toString() === fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

   
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const updatedRequest = await this.requestModel
      .findByIdAndUpdate(
        requestId,
        { $pull: { files: { _id: fileId } } },
        { new: true },
      )
      .populate('clientId', 'name company phone email')
      .populate('assignedTo', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('files.uploadedBy', 'fullName email')
      .exec();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: requestId,
      action: 'deleted',
      message: `File deleted: ${file.originalName}`,
      userId,
    });

    this.socketGateway.emitToAll('requestFileDeleted', {
      requestId,
      fileId,
      filename: file.originalName,
    });

    return updatedRequest!;
  }

  async remove(id: string): Promise<void> {
    const result = await this.requestModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('requestDeleted', { requestId: id });
  }
}
