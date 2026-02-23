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
  NEW_AGENT = 'NEW_AGENT',
  OUR_AGENT = 'OUR_AGENT',
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
  NEGOTIATIONS = 'negotiations',
  CALCULATION = 'calculation',
  DOCUMENTS = 'documents',
  LOADING = 'loading',
  TRANSIT = 'transit',
  DELIVERY = 'delivery',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export const REQUEST_STATUS_DEFINITIONS = {
  [RequestType.NEW_CLIENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.NEGOTIATIONS, title: 'Muzokaralar', order: 2, isFinal: false },
    { key: RequestStatusKey.CALCULATION, title: 'Hisoblash', order: 3, isFinal: false },
    { key: RequestStatusKey.DOCUMENTS, title: 'Hujjatlar', order: 4, isFinal: false },
    { key: RequestStatusKey.LOADING, title: 'Yuklash', order: 5, isFinal: false },
    { key: RequestStatusKey.TRANSIT, title: "Yo'lda", order: 6, isFinal: false },
    { key: RequestStatusKey.DELIVERY, title: 'Yetkazish', order: 7, isFinal: false },
    { key: RequestStatusKey.COMPLETED, title: 'Tugallandi', order: 8, isFinal: true },
    { key: RequestStatusKey.REJECTED, title: 'Rad etildi', order: 9, isFinal: true },
  ],
  [RequestType.OUR_CLIENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.NEGOTIATIONS, title: 'Muzokaralar', order: 2, isFinal: false },
    { key: RequestStatusKey.CALCULATION, title: 'Hisoblash', order: 3, isFinal: false },
    { key: RequestStatusKey.DOCUMENTS, title: 'Hujjatlar', order: 4, isFinal: false },
    { key: RequestStatusKey.LOADING, title: 'Yuklash', order: 5, isFinal: false },
    { key: RequestStatusKey.TRANSIT, title: "Yo'lda", order: 6, isFinal: false },
    { key: RequestStatusKey.DELIVERY, title: 'Yetkazish', order: 7, isFinal: false },
    { key: RequestStatusKey.COMPLETED, title: 'Tugallandi', order: 8, isFinal: true },
    { key: RequestStatusKey.REJECTED, title: 'Rad etildi', order: 9, isFinal: true },
  ],
  [RequestType.NEW_AGENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.NEGOTIATIONS, title: 'Muzokaralar', order: 2, isFinal: false },
    { key: RequestStatusKey.CALCULATION, title: 'Hisoblash', order: 3, isFinal: false },
    { key: RequestStatusKey.DOCUMENTS, title: 'Hujjatlar', order: 4, isFinal: false },
    { key: RequestStatusKey.LOADING, title: 'Yuklash', order: 5, isFinal: false },
    { key: RequestStatusKey.TRANSIT, title: "Yo'lda", order: 6, isFinal: false },
    { key: RequestStatusKey.DELIVERY, title: 'Yetkazish', order: 7, isFinal: false },
    { key: RequestStatusKey.COMPLETED, title: 'Tugallandi', order: 8, isFinal: true },
    { key: RequestStatusKey.REJECTED, title: 'Rad etildi', order: 9, isFinal: true },
  ],
  [RequestType.OUR_AGENT]: [
    { key: RequestStatusKey.NEW, title: 'Yangi', order: 1, isFinal: false },
    { key: RequestStatusKey.NEGOTIATIONS, title: 'Muzokaralar', order: 2, isFinal: false },
    { key: RequestStatusKey.CALCULATION, title: 'Hisoblash', order: 3, isFinal: false },
    { key: RequestStatusKey.DOCUMENTS, title: 'Hujjatlar', order: 4, isFinal: false },
    { key: RequestStatusKey.LOADING, title: 'Yuklash', order: 5, isFinal: false },
    { key: RequestStatusKey.TRANSIT, title: "Yo'lda", order: 6, isFinal: false },
    { key: RequestStatusKey.DELIVERY, title: 'Yetkazish', order: 7, isFinal: false },
    { key: RequestStatusKey.COMPLETED, title: 'Tugallandi', order: 8, isFinal: true },
    { key: RequestStatusKey.REJECTED, title: 'Rad etildi', order: 9, isFinal: true },
  ],
} as const;

const ALL_STATUSES = Object.values(RequestStatusKey);

// Har qanday statusdan har qanday statusga o'tish mumkin
const createFlexibleTransitions = () => {
  const transitions: Record<string, RequestStatusKey[]> = {};
  for (const status of ALL_STATUSES) {
    transitions[status] = ALL_STATUSES.filter(s => s !== status);
  }
  return transitions;
};

export const REQUEST_STATUS_TRANSITIONS = {
  [RequestType.NEW_CLIENT]: createFlexibleTransitions(),
  [RequestType.OUR_CLIENT]: createFlexibleTransitions(),
  [RequestType.NEW_AGENT]: createFlexibleTransitions(),
  [RequestType.OUR_AGENT]: createFlexibleTransitions(),
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

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RequestSchema = SchemaFactory.createForClass(Request);

RequestSchema.index({ type: 1, statusKey: 1, createdAt: -1 });
RequestSchema.index({ clientId: 1, createdAt: -1 });
RequestSchema.index({ assignedTo: 1, statusKey: 1 });
RequestSchema.index({ type: 1, statusKey: 1, position: 1 });
RequestSchema.index({ isArchived: 1, archivedAt: -1 });
