import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum RequestType {
  NEW_CLIENT = 'NEW_CLIENT',
  OUR_CLIENT = 'OUR_CLIENT',
}

@Schema({ timestamps: true, collection: 'request_statuses' })
export class RequestStatus extends Document {
  @Prop({ type: String, enum: RequestType, required: true })
  requestType: RequestType;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ default: false })
  isFinal: boolean;
}

export const RequestStatusSchema = SchemaFactory.createForClass(RequestStatus);

RequestStatusSchema.index({ requestType: 1, key: 1 }, { unique: true });
RequestStatusSchema.index({ requestType: 1, order: 1 });
