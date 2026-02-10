import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_UPDATED = 'REQUEST_UPDATED',
  REQUEST_STATUS_CHANGED = 'REQUEST_STATUS_CHANGED',
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_STATUS_CHANGED = 'DOCUMENT_STATUS_CHANGED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_PAID = 'INVOICE_PAID',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  INTERNAL_DOC_CREATED = 'INTERNAL_DOC_CREATED',
  INTERNAL_DOC_UPDATED = 'INTERNAL_DOC_UPDATED',
  PERSONNEL_DOC_CREATED = 'PERSONNEL_DOC_CREATED',
  PERSONNEL_DOC_UPDATED = 'PERSONNEL_DOC_UPDATED',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_STATUS_CHANGED = 'PAYMENT_STATUS_CHANGED',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ readBy: 1 });
NotificationSchema.index({ entityType: 1, entityId: 1 });
