import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DIRECTOR = 'director',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
  ADMINISTRATOR = 'administrator',
  OPERATOR = 'operator', // Legacy role, mapped to ADMINISTRATOR
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.MANAGER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop()
  lastLogin?: Date;

  // Invitation fields
  @Prop({ type: String, enum: InvitationStatus, default: InvitationStatus.ACCEPTED })
  invitationStatus: InvitationStatus;

  @Prop()
  invitationCode?: string;

  @Prop()
  invitationCodeExpires?: Date;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ type: 'ObjectId', ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @Prop()
  invitedAt?: Date;

  @Prop()
  acceptedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ invitationCode: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ companyId: 1 });
