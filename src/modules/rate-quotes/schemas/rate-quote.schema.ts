import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RateQuoteStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true, collection: 'rate_quotes' })
export class RateQuote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  requestId: Types.ObjectId;

  @Prop({ required: true })
  fromCity: string;

  @Prop({ required: true })
  toCity: string;

  @Prop()
  cargoName?: string;

  @Prop()
  weightKg?: number;

  @Prop()
  volumeM3?: number;

  @Prop({ required: true })
  cost: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  margin?: number;

  @Prop({ type: String, enum: RateQuoteStatus, default: RateQuoteStatus.DRAFT })
  status: RateQuoteStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;
}

export const RateQuoteSchema = SchemaFactory.createForClass(RateQuote);

RateQuoteSchema.index({ requestId: 1, createdAt: -1 });
RateQuoteSchema.index({ status: 1 });
RateQuoteSchema.index({ isArchived: 1, archivedAt: -1 });
