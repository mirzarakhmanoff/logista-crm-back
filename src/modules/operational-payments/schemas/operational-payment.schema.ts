import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentFile {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  path: string;

  @Prop({ type: Date, default: Date.now })
  uploadedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;
}

@Schema({ timestamps: true, collection: 'operational_payments' })
export class OperationalPayment extends Document {
  @Prop({ required: true })
  paymentNumber: string;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true })
  counterpartyName: string;

  @Prop({ required: true, type: String })
  counterpartyCategory: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, default: 'RUB' })
  currency: string;

  @Prop({
    required: true,
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.DRAFT
  })
  status: string;

  @Prop({ default: false })
  isCritical: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy: Types.ObjectId;

  @Prop({ type: Date })
  rejectedAt: Date;

  @Prop()
  rejectionReason: string;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop()
  paymentMethod: string;

  @Prop()
  paymentReference: string;

  @Prop()
  description: string;

  @Prop()
  notes: string;

  @Prop({ type: [PaymentFile], default: [] })
  files: PaymentFile[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: Date })
  archivedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const OperationalPaymentSchema = SchemaFactory.createForClass(OperationalPayment);

// Indexes for optimized queries
OperationalPaymentSchema.index({ paymentNumber: 1, companyId: 1 }, { unique: true });
OperationalPaymentSchema.index({ status: 1, createdAt: -1 });
OperationalPaymentSchema.index({ isCritical: 1, status: 1 });
OperationalPaymentSchema.index({ isArchived: 1 });
OperationalPaymentSchema.index({ date: -1 });
