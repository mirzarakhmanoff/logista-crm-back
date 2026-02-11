import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssuedCode, CodeStatus } from './schemas/issued-code.schema';
import { CreateIssuedCodeDto } from './dto/create-issued-code.dto';
import { UpdateIssuedCodeDto } from './dto/update-issued-code.dto';
import { Request } from '../requests/schemas/request.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class IssuedCodesService {
  constructor(
    @InjectModel(IssuedCode.name) private issuedCodeModel: Model<IssuedCode>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createDto: CreateIssuedCodeDto, issuedById: string): Promise<IssuedCode> {
    const request = await this.requestModel.findById(createDto.requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${createDto.requestId} not found`);
    }

    const existingCode = await this.issuedCodeModel.findOne({ code: createDto.code }).exec();
    if (existingCode) {
      throw new BadRequestException(`Code ${createDto.code} already exists`);
    }

    const issuedCode = new this.issuedCodeModel({
      ...createDto,
      requestId: new Types.ObjectId(createDto.requestId),
      issuedBy: new Types.ObjectId(issuedById),
      issuedAt: new Date(),
    });

    const savedCode = await issuedCode.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Code issued: ${createDto.code}`,
      userId: issuedById,
    });

    this.socketGateway.emitToAll('issuedCodeCreated', savedCode);

    return savedCode;
  }

  async findByRequest(requestId: string): Promise<IssuedCode[]> {
    return this.issuedCodeModel
      .find({ requestId: new Types.ObjectId(requestId), isArchived: { $ne: true } })
      .populate('issuedBy', 'fullName email')
      .sort({ issuedAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<IssuedCode> {
    const code = await this.issuedCodeModel
      .findById(id)
      .populate('issuedBy', 'fullName email')
      .exec();

    if (!code) {
      throw new NotFoundException(`Issued code with ID ${id} not found`);
    }

    return code;
  }

  async findByCode(code: string): Promise<IssuedCode> {
    const issuedCode = await this.issuedCodeModel
      .findOne({ code })
      .populate('requestId')
      .populate('issuedBy', 'fullName email')
      .exec();

    if (!issuedCode) {
      throw new NotFoundException(`Code ${code} not found`);
    }

    return issuedCode;
  }

  async update(id: string, updateDto: UpdateIssuedCodeDto, userId: string): Promise<IssuedCode> {
    const code = await this.issuedCodeModel.findById(id).exec();
    if (!code) {
      throw new NotFoundException(`Issued code with ID ${id} not found`);
    }

    if (updateDto.status === CodeStatus.CLOSED || updateDto.status === CodeStatus.CANCELLED) {
      code.closedAt = new Date();
    }

    Object.assign(code, updateDto);
    const savedCode = await code.save();

    const populatedCode = await this.findOne(id);

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: code.requestId.toString(),
      action: 'updated',
      message: `Code ${code.code} status changed to ${updateDto.status}`,
      userId,
    });

    this.socketGateway.emitToAll('issuedCodeUpdated', populatedCode);

    return populatedCode;
  }

  async getActiveCodes(): Promise<IssuedCode[]> {
    return this.issuedCodeModel
      .find({ status: CodeStatus.ACTIVE, isArchived: { $ne: true } })
      .populate('requestId')
      .populate('issuedBy', 'fullName email')
      .sort({ issuedAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.issuedCodeModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Issued code with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('issuedCodeDeleted', { codeId: id });
  }
}
