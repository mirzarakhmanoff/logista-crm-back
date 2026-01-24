import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestStatus, RequestType } from './schemas/request-status.schema';
import { RequestTransition } from './schemas/request-transition.schema';
import { CreateRequestStatusDto } from './dto/create-request-status.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Injectable()
export class RequestStatusesService {
  constructor(
    @InjectModel(RequestStatus.name) private statusModel: Model<RequestStatus>,
    @InjectModel(RequestTransition.name) private transitionModel: Model<RequestTransition>,
  ) {}

  async create(createDto: CreateRequestStatusDto): Promise<RequestStatus> {
    const status = new this.statusModel(createDto);
    return status.save();
  }

  async findAll(requestType?: RequestType): Promise<RequestStatus[]> {
    const query = requestType ? { requestType } : {};
    return this.statusModel.find(query).sort({ order: 1 }).exec();
  }

  async findOne(id: string): Promise<RequestStatus> {
    const status = await this.statusModel.findById(id).exec();
    if (!status) {
      throw new NotFoundException(`Request status with ID ${id} not found`);
    }
    return status;
  }

  async update(id: string, updateDto: UpdateRequestStatusDto): Promise<RequestStatus> {
    const status = await this.statusModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!status) {
      throw new NotFoundException(`Request status with ID ${id} not found`);
    }
    return status;
  }

  async remove(id: string): Promise<void> {
    const result = await this.statusModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Request status with ID ${id} not found`);
    }
  }

  async getDefaultStatusKey(requestType: RequestType): Promise<string> {
    const status = await this.statusModel
      .findOne({ requestType })
      .sort({ order: 1 })
      .exec();
    return status?.key || 'new';
  }

  async isValidTransition(requestType: RequestType, fromKey: string, toKey: string): Promise<boolean> {
    const transition = await this.transitionModel
      .findOne({ requestType, fromKey, toKey })
      .exec();
    return !!transition;
  }

  async getAvailableTransitions(requestType: RequestType, fromKey: string): Promise<string[]> {
    const transitions = await this.transitionModel
      .find({ requestType, fromKey })
      .exec();
    return transitions.map(t => t.toKey);
  }

  async createTransition(requestType: RequestType, fromKey: string, toKey: string): Promise<RequestTransition> {
    const transition = new this.transitionModel({ requestType, fromKey, toKey });
    return transition.save();
  }

  async seedDefaultStatuses(): Promise<void> {
    const existingCount = await this.statusModel.countDocuments();
    if (existingCount > 0) return;

    const newClientStatuses = [
      { requestType: RequestType.NEW_CLIENT, key: 'new', title: 'Yangi', order: 1, isFinal: false },
      { requestType: RequestType.NEW_CLIENT, key: 'in_work', title: 'Ishda', order: 2, isFinal: false },
      { requestType: RequestType.NEW_CLIENT, key: 'quote_sent', title: 'Taklif yuborildi', order: 3, isFinal: false },
      { requestType: RequestType.NEW_CLIENT, key: 'negotiation', title: 'Muzokaralar', order: 4, isFinal: false },
      { requestType: RequestType.NEW_CLIENT, key: 'won', title: 'Yutildi', order: 5, isFinal: true },
      { requestType: RequestType.NEW_CLIENT, key: 'lost', title: 'Yo\'qotildi', order: 6, isFinal: true },
    ];

    const ourClientStatuses = [
      { requestType: RequestType.OUR_CLIENT, key: 'new', title: 'Yangi', order: 1, isFinal: false },
      { requestType: RequestType.OUR_CLIENT, key: 'in_work', title: 'Ishda', order: 2, isFinal: false },
      { requestType: RequestType.OUR_CLIENT, key: 'loading', title: 'Yuklash', order: 3, isFinal: false },
      { requestType: RequestType.OUR_CLIENT, key: 'in_transit', title: 'Yo\'lda', order: 4, isFinal: false },
      { requestType: RequestType.OUR_CLIENT, key: 'delivered', title: 'Yetkazildi', order: 5, isFinal: false },
      { requestType: RequestType.OUR_CLIENT, key: 'completed', title: 'Tugallandi', order: 6, isFinal: true },
      { requestType: RequestType.OUR_CLIENT, key: 'cancelled', title: 'Bekor qilindi', order: 7, isFinal: true },
    ];

    await this.statusModel.insertMany([...newClientStatuses, ...ourClientStatuses]);

    // Seed transitions for NEW_CLIENT
    const newClientTransitions = [
      { requestType: RequestType.NEW_CLIENT, fromKey: 'new', toKey: 'in_work' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'in_work', toKey: 'quote_sent' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'in_work', toKey: 'lost' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'quote_sent', toKey: 'negotiation' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'quote_sent', toKey: 'lost' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'negotiation', toKey: 'won' },
      { requestType: RequestType.NEW_CLIENT, fromKey: 'negotiation', toKey: 'lost' },
    ];

    // Seed transitions for OUR_CLIENT
    const ourClientTransitions = [
      { requestType: RequestType.OUR_CLIENT, fromKey: 'new', toKey: 'in_work' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'in_work', toKey: 'loading' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'in_work', toKey: 'cancelled' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'loading', toKey: 'in_transit' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'loading', toKey: 'cancelled' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'in_transit', toKey: 'delivered' },
      { requestType: RequestType.OUR_CLIENT, fromKey: 'delivered', toKey: 'completed' },
    ];

    await this.transitionModel.insertMany([...newClientTransitions, ...ourClientTransitions]);
  }
}
