import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { SocketGateway } from '../../socket/socket.gateway';
import { DealsService } from '../deals/deals.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private socketGateway: SocketGateway,
    @Inject(forwardRef(() => DealsService))
    private dealsService: DealsService,
  ) {}

  async create(createClientDto: CreateClientDto, createdById: string): Promise<Client> {
    const client = new this.clientModel({
      ...createClientDto,
      createdBy: createdById,
    });

    const savedClient = await client.save();

    const populatedClient = await this.clientModel
      .findById(savedClient._id)
      .populate('assignedManager', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!populatedClient) {
      throw new NotFoundException('Failed to create client');
    }

    this.socketGateway.emitToAll('clientCreated', populatedClient);

    return populatedClient;
  }

  async findAll(filterDto: FilterClientDto): Promise<Client[]> {
    const query: any = {};

    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else {
      query.isArchived = false;
    }

    if (filterDto.type) query.type = filterDto.type;
    if (filterDto.category) query.category = filterDto.category;
    if (filterDto.supportLevel) query.supportLevel = filterDto.supportLevel;
    if (filterDto.status) query.status = filterDto.status;
    if (filterDto.assignedManager) query.assignedManager = filterDto.assignedManager;

    if (filterDto.search) {
      query.$or = [
        { companyName: { $regex: filterDto.search, $options: 'i' } },
        { email: { $regex: filterDto.search, $options: 'i' } },
        { phone: { $regex: filterDto.search, $options: 'i' } },
        { clientNumber: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    return this.clientModel
      .find(query)
      .populate('assignedManager', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientModel
      .findById(id)
      .populate('assignedManager', 'fullName avatar email phone')
      .populate('createdBy', 'fullName avatar email phone')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.clientModel
      .findByIdAndUpdate(id, updateClientDto, { new: true })
      .populate('assignedManager', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToAll('clientUpdated', client);

    return client;
  }

  async remove(id: string): Promise<void> {
    const result = await this.clientModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToAll('clientDeleted', { clientId: id });
  }

  async getClientStats() {
    const byStatus = await this.clientModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await this.clientModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const bySupportLevel = await this.clientModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$supportLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.clientModel.countDocuments({ isArchived: false });

    return { byStatus, byType, bySupportLevel, total };
  }

  async getClientDeals(clientId: string) {
    await this.findOne(clientId);
    return this.dealsService.findByClient(clientId);
  }
}
