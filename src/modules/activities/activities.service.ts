import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityType } from './schemas/activity.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    private socketGateway: SocketGateway,
  ) {}

  async createComment(
    documentId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Activity> {
    const activity = new this.activityModel({
      documentId,
      userId,
      type: ActivityType.COMMENT,
      content: createCommentDto.content,
      mentions: createCommentDto.mentions || [],
    });

    const savedActivity = await activity.save();

    const populatedActivity = await this.activityModel
      .findById(savedActivity._id)
      .populate('userId', 'fullName avatar email')
      .populate('mentions', 'fullName avatar email')
      .exec();

    if (!populatedActivity) {
      throw new NotFoundException('Failed to create activity');
    }

    // Real-time: Yangi comment qo'shildi
    this.socketGateway.emitNewComment(documentId, populatedActivity);

    return populatedActivity;
  }

  async createActivity(
    documentId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ): Promise<Activity> {
    const activity = new this.activityModel({
      documentId,
      userId,
      ...createActivityDto,
    });

    const savedActivity = await activity.save();

    const populatedActivity = await this.activityModel
      .findById(savedActivity._id)
      .populate('userId', 'fullName avatar email')
      .exec();

    if (!populatedActivity) {
      throw new NotFoundException('Failed to create activity');
    }

    // Real-time: Yangi activity qo'shildi
    this.socketGateway.emitNewActivity(documentId, populatedActivity);

    return populatedActivity;
  }

  async findAllByDocument(documentId: string): Promise<Activity[]> {
    return this.activityModel
      .find({ documentId })
      .populate('userId', 'fullName avatar email')
      .populate('mentions', 'fullName avatar email')
      .sort({ createdAt: 1 }) // oldest first (timeline order)
      .exec();
  }

  async findCommentsByDocument(documentId: string): Promise<Activity[]> {
    return this.activityModel
      .find({ documentId, type: ActivityType.COMMENT })
      .populate('userId', 'fullName avatar email')
      .populate('mentions', 'fullName avatar email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Activity> {
    const activity = await this.activityModel
      .findById(id)
      .populate('userId', 'fullName avatar email')
      .populate('mentions', 'fullName avatar email')
      .exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async remove(id: string, userId: string): Promise<void> {
    const activity = await this.activityModel.findById(id).exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    // Faqat o'z commentini o'chirishi mumkin
    if (activity.userId.toString() !== userId) {
      throw new Error('You can only delete your own comments');
    }

    await this.activityModel.findByIdAndDelete(id).exec();
  }

  async createStatusChangeActivity(
    documentId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<Activity> {
    return this.createActivity(documentId, userId, {
      type: ActivityType.STATUS_CHANGE,
      content: `Status o'zgartirildi: ${oldStatus} → ${newStatus}`,
      metadata: { oldStatus, newStatus },
    });
  }

  async createFileUploadActivity(
    documentId: string,
    userId: string,
    fileName: string,
  ): Promise<Activity> {
    return this.createActivity(documentId, userId, {
      type: ActivityType.FILE_UPLOAD,
      content: `Fayl yuklandi: ${fileName}`,
      metadata: { fileName },
    });
  }

  async createFileDeleteActivity(
    documentId: string,
    userId: string,
    fileName: string,
  ): Promise<Activity> {
    return this.createActivity(documentId, userId, {
      type: ActivityType.FILE_DELETE,
      content: `Fayl o'chirildi: ${fileName}`,
      metadata: { fileName },
    });
  }

  async createAssignmentChangeActivity(
    documentId: string,
    userId: string,
    oldAssignee: string,
    newAssignee: string,
  ): Promise<Activity> {
    return this.createActivity(documentId, userId, {
      type: ActivityType.ASSIGNMENT_CHANGE,
      content: `Mas'ul o'zgartirildi`,
      metadata: { oldAssignee, newAssignee },
    });
  }
}
