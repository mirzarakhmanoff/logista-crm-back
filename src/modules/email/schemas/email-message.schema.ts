import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  EmailDirection,
  EmailStatus,
  EmailAttachment,
  LinkedEntity,
} from '../interfaces/email.interfaces';

@Schema({ timestamps: true, collection: 'email_messages' })
export class EmailMessage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'EmailAccount', required: true })
  accountId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop()
  uid: number;

  @Prop({ type: String, enum: EmailDirection, required: true })
  direction: EmailDirection;

  @Prop({ type: String, enum: EmailStatus, default: EmailStatus.UNREAD })
  status: EmailStatus;

  @Prop({ type: Object, required: true })
  from: { name?: string; address: string };

  @Prop({ type: [Object], default: [] })
  to: { name?: string; address: string }[];

  @Prop({ type: [Object], default: [] })
  cc: { name?: string; address: string }[];

  @Prop({ type: [Object], default: [] })
  bcc: { name?: string; address: string }[];

  @Prop({ required: true })
  subject: string;

  @Prop()
  textBody?: string;

  @Prop()
  htmlBody?: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  inReplyTo?: string;

  @Prop({ type: [String], default: [] })
  references: string[];

  @Prop()
  threadId?: string;

  @Prop({
    type: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
        contentId: String,
      },
    ],
    default: [],
  })
  attachments: EmailAttachment[];

  @Prop({
    type: [
      {
        entityType: { type: String, enum: ['CLIENT', 'REQUEST'] },
        entityId: { type: Types.ObjectId },
      },
    ],
    default: [],
  })
  linkedEntities: LinkedEntity[];

  @Prop({ type: [String], default: [] })
  flags: string[];

  @Prop({ default: 'INBOX' })
  folder: string;

  @Prop({ type: Object })
  headers?: Record<string, string>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sentBy?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const EmailMessageSchema =
  SchemaFactory.createForClass(EmailMessage);

EmailMessageSchema.index({ accountId: 1, date: -1 });
EmailMessageSchema.index({ accountId: 1, uid: 1 });
EmailMessageSchema.index({ threadId: 1, date: 1 });
EmailMessageSchema.index({ direction: 1, status: 1 });
EmailMessageSchema.index({
  'linkedEntities.entityType': 1,
  'linkedEntities.entityId': 1,
});
EmailMessageSchema.index({ 'from.address': 1 });
EmailMessageSchema.index({ 'to.address': 1 });
EmailMessageSchema.index({ folder: 1, date: -1 });
