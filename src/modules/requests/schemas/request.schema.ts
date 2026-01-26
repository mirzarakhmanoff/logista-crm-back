import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface RequestFile {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export enum RequestType {
  NEW_CLIENT = 'NEW_CLIENT',
  OUR_CLIENT = 'OUR_CLIENT',
}

export enum RequestSource {
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  OLX = 'olx',
  SITE = 'site',
  PHONE = 'phone',
  OTHER = 'other',
}

export enum RequestStatusKey {
  NEW = 'new',
  IN_WORK = 'in_work',
  QUOTE_SENT = 'quote_sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  LOADING = 'loading',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const REQUEST_STATUS_DEFINITIONS = {
  [RequestType.NEW_CLIENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.IN_WORK, title: 'Ishda', order: 2, isFinal: false },
    { key: RequestStatusKey.QUOTE_SENT, title: 'Taklif yuborildi', order: 3, isFinal: false },
    { key: RequestStatusKey.NEGOTIATION, title: 'Muzokaralar', order: 4, isFinal: false },
    { key: RequestStatusKey.WON, title: 'Yutildi', order: 5, isFinal: true },
    { key: RequestStatusKey.LOST, title: "Yo'qotildi", order: 6, isFinal: true },
  ],
  [RequestType.OUR_CLIENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.IN_WORK, title: 'Ishda', order: 2, isFinal: false },
    { key: RequestStatusKey.LOADING, title: 'Yuklash', order: 3, isFinal: false },
    { key: RequestStatusKey.IN_TRANSIT, title: "Yo'lda", order: 4, isFinal: false },
    { key: RequestStatusKey.DELIVERED, title: 'Yetkazildi', order: 5, isFinal: false },
    { key: RequestStatusKey.COMPLETED, title: 'Tugallandi', order: 6, isFinal: true },
    { key: RequestStatusKey.CANCELLED, title: 'Bekor qilindi', order: 7, isFinal: true },
  ],
} as const;

export const REQUEST_STATUS_TRANSITIONS = {
  [RequestType.NEW_CLIENT]: {
    [RequestStatusKey.NEW]: [RequestStatusKey.IN_WORK],
    [RequestStatusKey.IN_WORK]: [RequestStatusKey.QUOTE_SENT, RequestStatusKey.LOST],
    [RequestStatusKey.QUOTE_SENT]: [RequestStatusKey.NEGOTIATION, RequestStatusKey.LOST],
    [RequestStatusKey.NEGOTIATION]: [RequestStatusKey.WON, RequestStatusKey.LOST],
  },
  [RequestType.OUR_CLIENT]: {
    [RequestStatusKey.NEW]: [RequestStatusKey.IN_WORK],
    [RequestStatusKey.IN_WORK]: [RequestStatusKey.LOADING, RequestStatusKey.CANCELLED],
    [RequestStatusKey.LOADING]: [RequestStatusKey.IN_TRANSIT, RequestStatusKey.CANCELLED],
    [RequestStatusKey.IN_TRANSIT]: [RequestStatusKey.DELIVERED],
    [RequestStatusKey.DELIVERED]: [RequestStatusKey.COMPLETED],
  },
} as const;

@Schema({ timestamps: true, collection: 'requests' })
export class Request extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop()
  client?: string;

  @Prop({ type: String, enum: RequestType, required: true })
  type: RequestType;

  @Prop({ type: String, enum: RequestStatusKey, required: true, default: RequestStatusKey.NEW })
  statusKey: RequestStatusKey;

  @Prop({ type: String, enum: RequestSource, default: RequestSource.OTHER })
  source: RequestSource;

  @Prop()
  comment?: string;

  @Prop()
  cargoName?: string;

  @Prop()
  route?: string;

  @Prop({ type: Number })
  weight?: number;

  @Prop({ type: Number })
  volume?: number;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: Date })
  deadline?: Date;

  @Prop()
  paymentStatus?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  manager?: string;

  @Prop({ default: 0 })
  position: number;

  @Prop({
    type: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: Date,
        uploadedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  files: RequestFile[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const RequestSchema = SchemaFactory.createForClass(Request);

RequestSchema.index({ type: 1, statusKey: 1, createdAt: -1 });
RequestSchema.index({ clientId: 1, createdAt: -1 });
RequestSchema.index({ assignedTo: 1, statusKey: 1 });
RequestSchema.index({ type: 1, statusKey: 1, position: 1 });
