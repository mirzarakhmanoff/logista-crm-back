import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from './schemas/conversation.schema';
import { ChatMessage } from './schemas/message.schema';
import { User } from '../users/schemas/user.schema';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import {
  ConversationType,
  MessageType,
} from './interfaces/chat.interfaces';

@Injectable()
export class ChatService {
  private logger = new Logger('ChatService');

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(ChatMessage.name)
    private messageModel: Model<ChatMessage>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private chatGateway: ChatGateway,
  ) {}

  // ==================== DEFAULT GROUP ====================

  async getOrCreateDefaultGroup(companyId: string) {
    const companyObjectId = companyId;

    let defaultGroup = await this.conversationModel
      .findOne({ isDefault: true, companyId: companyObjectId })
      .exec();

    const allActiveUsers = await this.userModel
      .find({ isActive: true, companyId: companyObjectId })
      .select('_id')
      .exec();
    const allUserIds = allActiveUsers.map((u) => u._id);

    if (!defaultGroup) {
      // Birinchi marta — default guruh yaratish
      defaultGroup = await this.conversationModel.create({
        type: ConversationType.GROUP,
        name: 'Umumiy',
        participants: allUserIds,
        createdBy: allUserIds[0] ?? null,
        admins: allUserIds.length > 0 ? [allUserIds[0]] : [],
        isDefault: true,
        companyId: companyObjectId,
      });

      // System message — faqat kamida bitta user bo'lganda
      if (allUserIds.length > 0) {
        await this.messageModel.create({
          conversationId: defaultGroup._id,
          senderId: allUserIds[0],
          content: 'Umumiy guruh yaratildi',
          type: MessageType.SYSTEM,
          readBy: allUserIds,
          companyId: companyObjectId,
        });
      }

      this.logger.log(`Default group created for company ${companyId}`);
    } else {
      // Yangi userlarni sinxronlash
      const currentIds = defaultGroup.participants.map((p) => p.toString());
      const newUserIds = allUserIds.filter(
        (id) => !currentIds.includes(id.toString()),
      );

      if (newUserIds.length > 0) {
        defaultGroup.participants = [
          ...new Set([
            ...currentIds,
            ...newUserIds.map((id) => id.toString()),
          ]),
        ].map((id) => new Types.ObjectId(id));
        await defaultGroup.save();
      }
    }

    return this.conversationModel
      .findById(defaultGroup._id)
      .populate('participants', 'fullName email avatar role')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'fullName avatar' },
      })
      .exec();
  }

  async ensureUserInDefaultGroup(userId: string, companyId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const companyObjectId = companyId;

    const defaultGroup = await this.conversationModel
      .findOne({ isDefault: true, companyId: companyObjectId })
      .exec();

    if (!defaultGroup) {
      // Default guruh hali yaratilmagan — yaratib qo'yamiz
      await this.getOrCreateDefaultGroup(companyId);
      return;
    }

    const isParticipant = defaultGroup.participants.some(
      (p) => p.toString() === userId,
    );

    if (!isParticipant) {
      await this.conversationModel.findByIdAndUpdate(defaultGroup._id, {
        $addToSet: { participants: userObjectId },
      });
    }
  }

  // ==================== CONVERSATIONS ====================

  async createConversation(
    dto: CreateConversationDto,
    userId: string,
    companyId: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const companyObjectId = companyId;
    const participantIds = [
      ...new Set([userId, ...dto.participantIds]),
    ].map((id) => new Types.ObjectId(id));

    if (dto.type === ConversationType.PRIVATE) {
      if (participantIds.length !== 2) {
        throw new BadRequestException(
          'Private suhbatda faqat 2 ta ishtirokchi bo\'lishi kerak',
        );
      }

      // Sort for consistent unique lookup
      const sorted = participantIds.sort((a, b) =>
        a.toString().localeCompare(b.toString()),
      );

      const existing = await this.conversationModel
        .findOne({
          type: ConversationType.PRIVATE,
          participants: { $all: sorted, $size: 2 },
          companyId: companyObjectId,
        })
        .populate('participants', 'fullName email avatar role')
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderId', select: 'fullName' },
        })
        .exec();

      if (existing) return existing;

      const conversation = await this.conversationModel.create({
        type: ConversationType.PRIVATE,
        participants: sorted,
        createdBy: userObjectId,
        companyId: companyObjectId,
      });

      const populated = await this.conversationModel
        .findById(conversation._id)
        .populate('participants', 'fullName email avatar role')
        .exec();

      this.chatGateway.emitNewConversation(
        participantIds.map((id) => id.toString()),
        populated,
      );

      return populated;
    }

    // Group
    if (!dto.name) {
      throw new BadRequestException('Guruh uchun nom kerak');
    }

    const conversation = await this.conversationModel.create({
      type: ConversationType.GROUP,
      name: dto.name,
      participants: participantIds,
      createdBy: userObjectId,
      admins: [userObjectId],
      companyId: companyObjectId,
    });

    // System message
    const user = await this.userModel.findById(userId).exec();
    await this.messageModel.create({
      conversationId: conversation._id,
      senderId: userObjectId,
      content: `${user?.fullName || 'Foydalanuvchi'} guruh yaratdi`,
      type: MessageType.SYSTEM,
      readBy: participantIds,
      companyId: companyObjectId,
    });

    const populated = await this.conversationModel
      .findById(conversation._id)
      .populate('participants', 'fullName email avatar role')
      .exec();

    this.chatGateway.emitNewConversation(
      participantIds.map((id) => id.toString()),
      populated,
    );

    return populated;
  }

  async getUserConversations(userId: string, query: GetConversationsDto, companyId: string) {
    // Default guruhga avtomatik qo'shish
    await this.ensureUserInDefaultGroup(userId, companyId);

    const userObjectId = new Types.ObjectId(userId);
    const companyObjectId = companyId;

    const pipeline: any[] = [
      { $match: { participants: userObjectId, companyId: companyObjectId } },
      { $sort: { updatedAt: -1 } },

      // Last message
      {
        $lookup: {
          from: 'chat_messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageData',
        },
      },
      {
        $unwind: {
          path: '$lastMessageData',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Unread count
      {
        $lookup: {
          from: 'chat_messages',
          let: { convId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $not: { $in: [userObjectId, '$readBy'] } },
                    { $ne: ['$senderId', userObjectId] },
                    { $eq: ['$isDeleted', false] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unreadData',
        },
      },
      {
        $addFields: {
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ['$unreadData.count', 0] }, 0],
          },
        },
      },

      // Participants
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                fullName: 1,
                email: 1,
                avatar: 1,
                role: 1,
              },
            },
          ],
          as: 'participants',
        },
      },

      // Last message sender
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessageData.senderId',
          foreignField: '_id',
          pipeline: [{ $project: { fullName: 1, avatar: 1 } }],
          as: 'lastMessageSender',
        },
      },

      {
        $project: {
          type: 1,
          name: 1,
          avatar: 1,
          participants: 1,
          admins: 1,
          createdBy: 1,
          updatedAt: 1,
          createdAt: 1,
          unreadCount: 1,
          lastMessage: {
            _id: '$lastMessageData._id',
            content: '$lastMessageData.content',
            type: '$lastMessageData.type',
            createdAt: '$lastMessageData.createdAt',
            senderId: '$lastMessageData.senderId',
            sender: { $arrayElemAt: ['$lastMessageSender', 0] },
          },
        },
      },
    ];

    if (query.search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: query.search, $options: 'i' } },
            {
              'participants.fullName': {
                $regex: query.search,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const conversations =
      await this.conversationModel.aggregate(pipeline);

    // Attach online status
    const onlineIds = this.chatGateway.getOnlineUserIds();
    for (const conv of conversations) {
      for (const p of conv.participants) {
        p.isOnline = onlineIds.includes(p._id.toString());
      }
    }

    return conversations;
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'fullName email avatar role')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'fullName avatar' },
      })
      .exec();

    if (!conversation) {
      throw new NotFoundException('Suhbat topilmadi');
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('Siz bu suhbat ishtirokchisi emassiz');
    }

    return conversation;
  }

  // ==================== MESSAGES ====================

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesDto,
  ) {
    // Verify participation
    await this.getConversationById(conversationId, userId);

    const convObjectId = new Types.ObjectId(conversationId);
    const filter: any = {
      conversationId: convObjectId,
      isDeleted: false,
    };

    if (query.before) {
      filter._id = { $lt: new Types.ObjectId(query.before) };
    }

    const limit = query.limit || 30;

    const total = await this.messageModel.countDocuments({
      conversationId: convObjectId,
      isDeleted: false,
    });

    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'fullName email avatar')
      .populate({
        path: 'replyTo',
        select: 'content senderId type',
        populate: { path: 'senderId', select: 'fullName' },
      })
      .exec();

    return {
      data: messages.reverse(),
      total,
      hasMore: messages.length === limit,
    };
  }

  async sendMessage(
    dto: SendMessageDto,
    userId: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);

    // Verify participation
    const conversation = await this.getConversationById(
      dto.conversationId,
      userId,
    );

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: userObjectId,
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      replyTo: dto.replyTo
        ? new Types.ObjectId(dto.replyTo)
        : undefined,
      readBy: [userObjectId],
      companyId: (conversation as any).companyId,
    });

    // Update conversation lastMessage
    await this.conversationModel.findByIdAndUpdate(dto.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const populated = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'fullName email avatar')
      .populate({
        path: 'replyTo',
        select: 'content senderId type',
        populate: { path: 'senderId', select: 'fullName' },
      })
      .exec();

    // Real-time events
    this.chatGateway.emitNewMessage(dto.conversationId, populated);

    const participantIds = conversation.participants.map((p: any) =>
      p._id.toString(),
    );
    this.chatGateway.emitConversationUpdated(participantIds, {
      conversationId: dto.conversationId,
      lastMessage: populated,
    });

    this.logger.log(
      `Message sent in ${dto.conversationId} by ${userId}`,
    );

    return populated;
  }

  async sendMessageWithAttachments(
    dto: SendMessageDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);

    const conversation = await this.getConversationById(
      dto.conversationId,
      userId,
    );

    const attachments = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path.replace(/\\/g, '/'),
      mimetype: file.mimetype,
      size: file.size,
    }));

    const hasImages = files.some((f) => f.mimetype.startsWith('image/'));
    const messageType =
      dto.type || (hasImages ? MessageType.IMAGE : MessageType.FILE);

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: userObjectId,
      content: dto.content || (hasImages ? 'Rasm' : 'Fayl'),
      type: messageType,
      attachments,
      replyTo: dto.replyTo
        ? new Types.ObjectId(dto.replyTo)
        : undefined,
      readBy: [userObjectId],
      companyId: (conversation as any).companyId,
    });

    await this.conversationModel.findByIdAndUpdate(dto.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const populated = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'fullName email avatar')
      .exec();

    this.chatGateway.emitNewMessage(dto.conversationId, populated);

    const participantIds = conversation.participants.map((p: any) =>
      p._id.toString(),
    );
    this.chatGateway.emitConversationUpdated(participantIds, {
      conversationId: dto.conversationId,
      lastMessage: populated,
    });

    return populated;
  }

  // ==================== READ RECEIPTS ====================

  async markConversationAsRead(conversationId: string, userId: string) {
    await this.getConversationById(conversationId, userId);

    const userObjectId = new Types.ObjectId(userId);

    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        readBy: { $ne: userObjectId },
      },
      { $addToSet: { readBy: userObjectId } },
    );

    this.chatGateway.emitMessageRead(conversationId, {
      userId,
      readAt: new Date(),
    });

    return { success: true };
  }

  // ==================== UNREAD COUNT ====================

  async getTotalUnreadCount(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const conversations = await this.conversationModel
      .find({ participants: userObjectId })
      .select('_id')
      .exec();

    const conversationIds = conversations.map((c) => c._id);

    const unreadCount = await this.messageModel.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userObjectId },
      readBy: { $ne: userObjectId },
      isDeleted: false,
    });

    return { unreadCount };
  }

  // ==================== ONLINE USERS ====================

  async getOnlineUsers(companyId: string) {
    const onlineIds = this.chatGateway.getOnlineUserIds();
    if (onlineIds.length === 0) return [];

    return this.userModel
      .find({
        _id: { $in: onlineIds.map((id) => new Types.ObjectId(id)) },
        isActive: true,
        companyId: companyId,
      })
      .select('fullName email avatar role')
      .exec();
  }

  // ==================== UPDATE CONVERSATION ====================

  async updateConversation(
    conversationId: string,
    dto: UpdateConversationDto,
    userId: string,
  ) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Suhbat topilmadi');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException(
        'Faqat guruh suhbatlarni yangilash mumkin',
      );
    }

    const isAdmin = conversation.admins.some(
      (a) => a.toString() === userId,
    );
    if (!isAdmin) {
      throw new ForbiddenException('Faqat admin guruhni yangilashi mumkin');
    }

    // Default guruhdan ishtirokchilarni olib tashlab bo'lmaydi
    if ((conversation as any).isDefault && dto.removeParticipants?.length) {
      throw new BadRequestException(
        'Umumiy guruhdan ishtirokchilarni olib tashlab bo\'lmaydi',
      );
    }

    if (dto.name) {
      conversation.name = dto.name;
    }

    if (dto.addParticipants?.length) {
      const newIds = dto.addParticipants.map(
        (id) => new Types.ObjectId(id),
      );
      conversation.participants = [
        ...new Set([
          ...conversation.participants.map((p) => p.toString()),
          ...dto.addParticipants,
        ]),
      ].map((id) => new Types.ObjectId(id));

      const user = await this.userModel.findById(userId).exec();
      const newUsers = await this.userModel
        .find({ _id: { $in: newIds } })
        .exec();
      const names = newUsers.map((u) => u.fullName).join(', ');

      await this.messageModel.create({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(userId),
        content: `${user?.fullName} ${names} ni qo'shdi`,
        type: MessageType.SYSTEM,
        readBy: conversation.participants,
        companyId: conversation.companyId,
      });
    }

    if (dto.removeParticipants?.length) {
      conversation.participants = conversation.participants.filter(
        (p) => !dto.removeParticipants!.includes(p.toString()),
      );
    }

    await conversation.save();

    const populated = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'fullName email avatar role')
      .exec();

    this.chatGateway.emitConversationUpdated(
      conversation.participants.map((p) => p.toString()),
      populated,
    );

    return populated;
  }
}
