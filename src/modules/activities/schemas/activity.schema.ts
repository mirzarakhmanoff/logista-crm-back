import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum ActivityType {
  COMMENT = 'comment',
  STATUS_CHANGE = 'status_change',
  FILE_UPLOAD = 'file_upload',
  FILE_DELETE = 'file_delete',
  ASSIGNMENT_CHANGE = 'assignment_change',
  PRIORITY_CHANGE = 'priority_change',
  MENTION = 'mention',
  EMAIL_INTEGRATION = 'email_integration',
  SYSTEM = 'system',
}

export interface ActivityMetadata {
  oldStatus?: string;
  newStatus?: string;
  oldAssignee?: string;
  newAssignee?: string;
  oldPriority?: string;
  newPriority?: string;
  fileName?: string;
  emailSubject?: string;
  [key: string]: any;
}

@Schema({ timestamps: true })
export class Activity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Document', required: true })
  documentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({
    type: String,
    enum: ActivityType,
    required: true,
    default: ActivityType.COMMENT,
  })
  type: ActivityType;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];

  @Prop({ type: Object })
  metadata?: ActivityMetadata;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
