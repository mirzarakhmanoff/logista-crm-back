import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Client, ClientType } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientDto } from './dto/filter-client.dto';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private socketGateway: SocketGateway,
  ) {}

  private generateClientNumber(type: ClientType = ClientType.CLIENT) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    const prefix = type === ClientType.AGENT ? 'AG' : 'CL';
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(createClientDto: CreateClientDto, createdById: string): Promise<Client> {
    const clientType = createClientDto.type || ClientType.CLIENT;
    const clientNumber = createClientDto.clientNumber?.trim() || this.generateClientNumber(clientType);

    const client = new this.clientModel({
      ...createClientDto,
      clientNumber,
      createdBy: createdById,
    });

    const savedClient = await client.save();

    const populatedClient = await this.clientModel
      .findById(savedClient._id)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!populatedClient) {
      throw new NotFoundException('Failed to create client');
    }

    this.socketGateway.emitToAll('clientCreated', populatedClient);

    return populatedClient;
  }

  async findAll(filterDto: FilterClientDto): Promise<{ data: Client[]; total: number; page: number; limit: number }> {
    const query: any = {
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

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.clientModel
      .findByIdAndUpdate(id, updateClientDto, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    this.socketGateway.emitToAll('clientUpdated', client);

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

    this.socketGateway.emitToAll('clientUpdated', updatedClient);

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

    this.socketGateway.emitToAll('clientUpdated', updatedClient);

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

    this.socketGateway.emitToAll('clientDeleted', { clientId: id });
  }
}
