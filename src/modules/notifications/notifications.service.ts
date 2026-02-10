import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private socketGateway: SocketGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = new this.notificationModel({
      type: dto.type,
      title: dto.title,
      message: dto.message,
      entityType: dto.entityType,
      entityId: new Types.ObjectId(dto.entityId),
      createdBy: dto.createdBy ? new Types.ObjectId(dto.createdBy) : undefined,
      metadata: dto.metadata,
    });

    const saved = await notification.save();

    const populated = await this.notificationModel
      .findById(saved._id)
      .populate('createdBy', 'fullName email avatar')
      .exec();

    this.socketGateway.emitNewNotification(populated);

    return populated!;
  }

  async findAll(
    userId: string,
    filterDto: FilterNotificationDto,
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number; unreadCount: number }> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filterDto.unreadOnly) {
      query.readBy = { $ne: new Types.ObjectId(userId) };
    }

    const [data, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('createdBy', 'fullName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
      this.notificationModel.countDocuments({
        readBy: { $ne: new Types.ObjectId(userId) },
      }),
    ]);

    return { data, total, page, limit, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      readBy: { $ne: new Types.ObjectId(userId) },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel
      .findByIdAndUpdate(
        notificationId,
        { $addToSet: { readBy: new Types.ObjectId(userId) } },
        { new: true },
      )
      .populate('createdBy', 'fullName email avatar')
      .exec();

    return notification!;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);

    await this.notificationModel.updateMany(
      { readBy: { $ne: userObjectId } },
      { $addToSet: { readBy: userObjectId } },
    );
  }
}
