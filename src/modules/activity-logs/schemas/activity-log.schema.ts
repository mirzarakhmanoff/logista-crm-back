import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EntityType {
  CLIENT = 'CLIENT',
  REQUEST = 'REQUEST',
  SHIPMENT = 'SHIPMENT',
  INVOICE = 'INVOICE',
  RATE_QUOTE = 'RATE_QUOTE',
  ISSUED_CODE = 'ISSUED_CODE',
  DOCUMENT = 'DOCUMENT',
  EMAIL = 'EMAIL',
  INTERNAL_DOCUMENT = 'INTERNAL_DOCUMENT',
  PERSONNEL_DOCUMENT = 'PERSONNEL_DOCUMENT',
  OPERATIONAL_PAYMENT = 'OPERATIONAL_PAYMENT',
}

export enum ActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  FILE_UPLOADED = 'file_uploaded',
  COMMENT = 'comment',
  DELETED = 'deleted',
  EMAIL_SENT = 'email_sent',
  EMAIL_RECEIVED = 'email_received',
  EMAIL_LINKED = 'email_linked',
}

@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog extends Document {
  @Prop({ type: String, enum: EntityType, required: true })
  entityType: EntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: String, enum: ActionType, required: true })
  action: ActionType;

  @Prop()
  message?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.virtual('content').get(function content() {
  if (this.action !== ActionType.COMMENT) {
    return undefined;
  }

  return this.metadata?.content ?? this.message;
});

ActivityLogSchema.set('toJSON', { virtuals: true });
ActivityLogSchema.set('toObject', { virtuals: true });

ActivityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
