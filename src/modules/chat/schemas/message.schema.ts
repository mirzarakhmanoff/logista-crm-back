import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageType } from '../interfaces/chat.interfaces';

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({
    type: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
      },
    ],
    default: [],
  })
  attachments: {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
  }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'ChatMessage' })
  replyTo?: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  editedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const ChatMessageSchema =
  SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, readBy: 1 });
