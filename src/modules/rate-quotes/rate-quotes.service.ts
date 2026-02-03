import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RateQuote } from './schemas/rate-quote.schema';
import { CreateRateQuoteDto } from './dto/create-rate-quote.dto';
import { UpdateRateQuoteDto } from './dto/update-rate-quote.dto';
import { Request } from '../requests/schemas/request.schema';
import { SocketGateway } from '../../socket/socket.gateway';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class RateQuotesService {
  constructor(
    @InjectModel(RateQuote.name) private rateQuoteModel: Model<RateQuote>,
    @InjectModel(Request.name) private requestModel: Model<Request>,
    private socketGateway: SocketGateway,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(createDto: CreateRateQuoteDto, createdById: string): Promise<RateQuote> {
    const request = await this.requestModel.findById(createDto.requestId).exec();
    if (!request) {
      throw new NotFoundException(`Request with ID ${createDto.requestId} not found`);
    }

    const quote = new this.rateQuoteModel({
      ...createDto,
      createdBy: createdById,
    });

    const savedQuote = await quote.save();

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: createDto.requestId,
      action: 'updated',
      message: `Rate quote created: ${createDto.fromCity} -> ${createDto.toCity}`,
      userId: createdById,
    });

    this.socketGateway.emitToAll('rateQuoteCreated', savedQuote);

    return savedQuote;
  }

  async findByRequest(requestId: string): Promise<RateQuote[]> {
    return this.rateQuoteModel
      .find({ requestId: new Types.ObjectId(requestId), isArchived: { $ne: true } })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<RateQuote> {
    const quote = await this.rateQuoteModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!quote) {
      throw new NotFoundException(`Rate quote with ID ${id} not found`);
    }

    return quote;
  }

  async update(id: string, updateDto: UpdateRateQuoteDto, userId: string): Promise<RateQuote> {
    const quote = await this.rateQuoteModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate('createdBy', 'fullName email')
      .exec();

    if (!quote) {
      throw new NotFoundException(`Rate quote with ID ${id} not found`);
    }

    await this.activityLogsService.log({
      entityType: 'REQUEST',
      entityId: quote.requestId.toString(),
      action: 'updated',
      message: `Rate quote updated`,
      userId,
    });

    this.socketGateway.emitToAll('rateQuoteUpdated', quote);

    return quote;
  }

  async remove(id: string): Promise<void> {
    const result = await this.rateQuoteModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Rate quote with ID ${id} not found`);
    }
    this.socketGateway.emitToAll('rateQuoteDeleted', { quoteId: id });
  }
}
