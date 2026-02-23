import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ConversationType } from '../interfaces/chat.interfaces';

@Schema({ timestamps: true, collection: 'chat_conversations' })
export class Conversation extends Document {
  @Prop({ type: String, enum: ConversationType, required: true })
  type: ConversationType;

  @Prop()
  name?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  admins: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'ChatMessage' })
  lastMessage?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const ConversationSchema =
  SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index(
  { companyId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);
