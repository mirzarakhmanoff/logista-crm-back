import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ClientType {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
}

@Schema({ timestamps: true })
export class Client extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ClientType, default: ClientType.CLIENT })
  type: ClientType;

  @Prop()
  clientNumber?: string;

  @Prop()
  company?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  inn?: string;

  @Prop()
  address?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index({ name: 'text', company: 'text', phone: 'text', email: 'text' });
ClientSchema.index({ createdAt: -1 });
ClientSchema.index({ type: 1, createdAt: -1 });
ClientSchema.index({ isArchived: 1, archivedAt: -1 });
ClientSchema.index({ clientNumber: 1, companyId: 1 }, { unique: true, sparse: true });
