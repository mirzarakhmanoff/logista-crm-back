import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Client, ClientType } from './schemas/client.schema';
import { Request } from '../requests/schemas/request.schema';
import { Document } from '../documents/schemas/document.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { Shipment } from '../shipments/schemas/shipment.schema';
import { RateQuote } from '../rate-quotes/schemas/rate-quote.schema';
import { IssuedCode } from '../issued-codes/schemas/issued-code.schema';
import { ActivityLog } from '../activity-logs/schemas/activity-log.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { SocketGateway } from '../../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(Document.name) private documentModel: Model<Document>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(RateQuote.name) private rateQuoteModel: Model<RateQuote>,
    @InjectModel(IssuedCode.name) private issuedCodeModel: Model<IssuedCode>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>,
    private socketGateway: SocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  private generateClientNumber(type: ClientType = ClientType.CLIENT) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    const prefix = type === ClientType.AGENT ? 'AG' : 'CL';
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(createClientDto: CreateClientDto, createdById: string, companyId: string): Promise<Client> {
    const clientType = createClientDto.type || ClientType.CLIENT;
    const clientNumber = createClientDto.clientNumber?.trim() || this.generateClientNumber(clientType);

    const client = new this.clientModel({
      ...createClientDto,
      clientNumber,
      createdBy: createdById,
      companyId: new Types.ObjectId(companyId),
    });

    const savedClient = await client.save();

    const populatedClient = await this.clientModel
      .findById(savedClient._id)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!populatedClient) {
      throw new NotFoundException('Failed to create client');
    }

    this.socketGateway.emitToCompany(companyId, 'clientCreated', populatedClient);

    this.notificationsService.create({
      type: NotificationType.CLIENT_CREATED,
      title: 'Новый клиент',
      message: `Добавлен клиент "${populatedClient.name}"`,
      entityType: 'CLIENT',
      entityId: populatedClient._id.toString(),
      createdBy: createdById,
      companyId,
    });

    return populatedClient;
  }

  async findAll(filterDto: FilterClientDto, companyId: string): Promise<{ data: Client[]; total: number; page: number; limit: number }> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      isArchived: { $ne: true },
    };
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    if (filterDto.type) {
      query.type = filterDto.type;
    }

    if (filterDto.search) {
      query.$or = [
        { name: { $regex: filterDto.search, $options: 'i' } },
        { company: { $regex: filterDto.search, $options: 'i' } },
        { email: { $regex: filterDto.search, $options: 'i' } },
        { phone: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.clientModel
        .find(query)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.clientModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, updatedById?: string): Promise<Client> {
    const client = await this.clientModel
      .findByIdAndUpdate(id, updateClientDto, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToCompany(client.companyId?.toString(), 'clientUpdated', client);

    this.notificationsService.create({
      type: NotificationType.CLIENT_UPDATED,
      title: 'Клиент обновлён',
      message: `Клиент "${client.name}" обновлён`,
      entityType: 'CLIENT',
      entityId: id,
      createdBy: updatedById,
    });

    return client;
  }

  async updateAvatar(id: string, filePath: string): Promise<Client> {
    const client = await this.clientModel.findById(id).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // Delete old avatar file if exists
    if (client.avatar) {
      const oldPath = client.avatar.replace(/\//g, path.sep);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarUrl = filePath.replace(/\\/g, '/');

    const updatedClient = await this.clientModel
      .findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!updatedClient) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToCompany(updatedClient.companyId?.toString(), 'clientUpdated', updatedClient);

    return updatedClient;
  }

  async removeAvatar(id: string): Promise<Client> {
    const client = await this.clientModel.findById(id).exec();
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (client.avatar) {
      const oldPath = client.avatar.replace(/\//g, path.sep);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const updatedClient = await this.clientModel
      .findByIdAndUpdate(id, { $unset: { avatar: '' } }, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!updatedClient) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToCompany(updatedClient.companyId?.toString(), 'clientUpdated', updatedClient);

    return updatedClient;
  }

  async remove(id: string): Promise<void> {
    const client = await this.clientModel.findById(id).exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // Delete avatar file if exists
    if (client.avatar) {
      const avatarPath = client.avatar.replace(/\//g, path.sep);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await this.clientModel.findByIdAndDelete(id).exec();

    this.socketGateway.emitToCompany(client.companyId?.toString(), 'clientDeleted', { clientId: id });
  }

  async findOneWithAllRelations(id: string): Promise<any> {
    const client = await this.clientModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    const clientObjectId = new Types.ObjectId(id);

    // Fetch all requests for this client
    const requests = await this.requestModel
      .find({ clientId: clientObjectId, isArchived: { $ne: true } })
      .populate('assignedTo', 'fullName email')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();

    const requestIds = requests.map((r) => r._id);

    // Fetch all related data in parallel
    const [
      documents,
      invoices,
      shipments,
      rateQuotes,
      issuedCodes,
      activityLogs,
    ] = await Promise.all([
      // Documents linked to this client
      this.documentModel
        .find({ client: clientObjectId, isArchived: { $ne: true } })
        .populate('assignedTo', 'fullName email')
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .exec(),

      // Invoices from client's requests
      this.invoiceModel
        .find({ requestId: { $in: requestIds }, isArchived: { $ne: true } })
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .exec(),

      // Shipments from client's requests
      this.shipmentModel
        .find({ requestId: { $in: requestIds }, isArchived: { $ne: true } })
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .exec(),

      // Rate quotes from client's requests
      this.rateQuoteModel
        .find({ requestId: { $in: requestIds }, isArchived: { $ne: true } })
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .exec(),

      // Issued codes from client's requests
      this.issuedCodeModel
        .find({ requestId: { $in: requestIds }, isArchived: { $ne: true } })
        .populate('issuedBy', 'fullName email')
        .sort({ issuedAt: -1 })
        .exec(),

      // Activity logs for this client
      this.activityLogModel
        .find({ entityType: 'CLIENT', entityId: id })
        .populate('userId', 'fullName email avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .exec(),
    ]);

    // Calculate statistics
    const stats = {
      totalRequests: requests.length,
      requestsByStatus: requests.reduce((acc, req) => {
        acc[req.statusKey] = (acc[req.statusKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalDocuments: documents.length,
      totalInvoices: invoices.length,
      totalShipments: shipments.length,
      totalRateQuotes: rateQuotes.length,
      totalIssuedCodes: issuedCodes.length,
      financials: {
        totalInvoiceAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        totalPaidAmount: invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        unpaidAmount: invoices.reduce(
          (sum, inv) => sum + ((inv.amount || 0) - (inv.paidAmount || 0)),
          0,
        ),
        currency: invoices[0]?.currency || 'USD',
      },
      shipmentsInTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
      activeIssuedCodes: issuedCodes.filter((c) => c.status === 'ACTIVE').length,
    };

    return {
      client,
      requests,
      documents,
      invoices,
      shipments,
      rateQuotes,
      issuedCodes,
      activityLogs,
      stats,
    };
  }
}
