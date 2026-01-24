import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RequestType } from './request-status.schema';

@Schema({ timestamps: true, collection: 'request_transitions' })
export class RequestTransition extends Document {
  @Prop({ type: String, enum: RequestType, required: true })
  requestType: RequestType;

  @Prop({ required: true })
  fromKey: string;

  @Prop({ required: true })
  toKey: string;
}

export const RequestTransitionSchema = SchemaFactory.createForClass(RequestTransition);

RequestTransitionSchema.index({ requestType: 1, fromKey: 1, toKey: 1 }, { unique: true });
