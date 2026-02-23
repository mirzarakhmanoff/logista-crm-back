import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schemas/activity-log.schema';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>,
  ) {}

  async log(dto: CreateActivityLogDto & { companyId?: string }): Promise<ActivityLog> {
    const log = new this.activityLogModel({
      entityType: dto.entityType,
      entityId: new Types.ObjectId(dto.entityId),
      action: dto.action,
      message: dto.message,
      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
      metadata: dto.metadata,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : undefined,
    });
    return log.save();
  }

  async findByEntity(entityType: string, entityId: string, limit = 50): Promise<ActivityLog[]> {
    return this.activityLogModel
      .find({ entityType, entityId: new Types.ObjectId(entityId) })
      .populate('userId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findByUser(userId: string, limit = 50): Promise<ActivityLog[]> {
    return this.activityLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findRecent(limit = 100, companyId?: string): Promise<ActivityLog[]> {
    const query: any = {};
    if (companyId) {
      query.companyId = companyId;
    }
    return this.activityLogModel
      .find(query)
      .populate('userId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
