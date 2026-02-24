import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssuedCode, CodeStatus, IssuedFor } from './schemas/issued-code.schema';
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

  async create(createDto: CreateIssuedCodeDto, issuedById: string, companyId: string): Promise<IssuedCode> {
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
      companyId: new Types.ObjectId(companyId),
    });

    const savedCode = await issuedCode.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Code issued: ${createDto.code}`,
      userId: issuedById,
      companyId,
    });

    this.socketGateway.emitToCompany(companyId, 'issuedCodeCreated', savedCode);

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
      companyId: code.companyId?.toString(),
    });

    this.socketGateway.emitToCompany(code.companyId?.toString(), 'issuedCodeUpdated', populatedCode);

    return populatedCode;
  }

  async getActiveCodes(issuedFor?: IssuedFor): Promise<IssuedCode[]> {
    const filter: any = { status: CodeStatus.ACTIVE, isArchived: { $ne: true } };
    if (issuedFor) {
      filter.issuedFor = issuedFor;
    }
    return this.issuedCodeModel
      .find(filter)
      .populate('requestId')
      .populate('issuedBy', 'fullName email')
      .sort({ issuedAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const code = await this.issuedCodeModel.findById(id).exec();
    if (!code) {
      throw new NotFoundException(`Issued code with ID ${id} not found`);
    }
    const companyId = code.companyId?.toString();
    await this.issuedCodeModel.findByIdAndDelete(id).exec();
    this.socketGateway.emitToCompany(companyId, 'issuedCodeDeleted', { codeId: id });
  }
}
