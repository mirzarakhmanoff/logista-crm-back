import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CodeType {
  INTERNAL = 'internal',
  WAREHOUSE = 'warehouse',
  CONTAINER = 'container',
  OTHER = 'other',
}

export enum CodeStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'issued_codes' })
export class IssuedCode extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  requestId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: CodeType, default: CodeType.OTHER })
  codeType: CodeType;

  @Prop({ type: String, enum: CodeStatus, default: CodeStatus.ACTIVE })
  status: CodeStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Types.ObjectId;

  @Prop()
  issuedAt: Date;

  @Prop()
  closedAt?: Date;

  @Prop()
  notes?: string;
}

export const IssuedCodeSchema = SchemaFactory.createForClass(IssuedCode);

IssuedCodeSchema.index({ code: 1 }, { unique: true });
IssuedCodeSchema.index({ requestId: 1, status: 1 });
IssuedCodeSchema.index({ status: 1 });
