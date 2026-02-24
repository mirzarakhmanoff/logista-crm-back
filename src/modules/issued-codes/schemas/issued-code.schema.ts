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

export enum IssuedFor {
  AGENT = 'agent',
  CLIENT = 'client',
}

@Schema({ timestamps: true, collection: 'issued_codes' })
export class IssuedCode extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  requestId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ type: String, enum: CodeType, default: CodeType.OTHER })
  codeType: CodeType;

  @Prop({ type: String, enum: IssuedFor, required: true })
  issuedFor: IssuedFor;

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

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const IssuedCodeSchema = SchemaFactory.createForClass(IssuedCode);

IssuedCodeSchema.index({ requestId: 1, status: 1 });
IssuedCodeSchema.index({ status: 1 });
IssuedCodeSchema.index({ isArchived: 1, archivedAt: -1 });
IssuedCodeSchema.index({ code: 1, companyId: 1 }, { unique: true });
