import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RequestType } from '../../request-statuses/schemas/request-status.schema';

export enum RequestSource {
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  OLX = 'olx',
  SITE = 'site',
  PHONE = 'phone',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'requests' })
export class Request extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: String, enum: RequestType, required: true })
  type: RequestType;

  @Prop({ required: true, default: 'new' })
  statusKey: string;

  @Prop({ type: String, enum: RequestSource, default: RequestSource.OTHER })
  source: RequestSource;

  @Prop()
  comment?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ default: 0 })
  position: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RequestSchema = SchemaFactory.createForClass(Request);

RequestSchema.index({ type: 1, statusKey: 1, createdAt: -1 });
RequestSchema.index({ clientId: 1, createdAt: -1 });
RequestSchema.index({ assignedTo: 1, statusKey: 1 });
RequestSchema.index({ type: 1, statusKey: 1, position: 1 });
