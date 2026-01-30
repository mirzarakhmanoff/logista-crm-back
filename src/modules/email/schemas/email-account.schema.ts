import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  EmailProvider,
  EmailAccountStatus,
} from '../interfaces/email.interfaces';

@Schema({ timestamps: true, collection: 'email_accounts' })
export class EmailAccount extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  emailAddress: string;

  @Prop({ type: String, enum: EmailProvider, required: true })
  provider: EmailProvider;

  @Prop({
    type: String,
    enum: EmailAccountStatus,
    default: EmailAccountStatus.ACTIVE,
  })
  status: EmailAccountStatus;

  @Prop({ type: Object })
  imapConfig?: {
    host: string;
    port: number;
    secure: boolean;
  };

  @Prop({ type: Object })
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
  };

  @Prop({ type: Object, select: false })
  credentials: {
    user: string;
    password?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  };

  @Prop({ default: 0 })
  lastSyncUid: number;

  @Prop()
  lastSyncAt?: Date;

  @Prop()
  lastError?: string;

  @Prop({ default: true })
  syncEnabled: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  sharedWith: Types.ObjectId[];
}

export const EmailAccountSchema =
  SchemaFactory.createForClass(EmailAccount);

EmailAccountSchema.index({ emailAddress: 1 }, { unique: true });
EmailAccountSchema.index({ provider: 1 });
EmailAccountSchema.index({ createdBy: 1 });
EmailAccountSchema.index({ status: 1, syncEnabled: 1 });
