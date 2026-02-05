import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum InternalDocumentStatus {
  DRAFT = 'draft',
  SIGNING = 'signing',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  UNDER_REVIEW = 'under_review',
  OVERDUE = 'overdue',
  ARCHIVED = 'archived',
}

export interface InternalDocumentFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class InternalDocument extends Document {
  @Prop({ required: true, unique: true })
  documentNumber: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'DocumentCategory', required: true })
  category: Types.ObjectId;

  @Prop()
  counterparty?: string;

  @Prop()
  type?: string;

  @Prop({ default: 0 })
  amount: number;

  @Prop({ default: '₽' })
  currency: string;

  @Prop()
  amountPeriod?: string;

  @Prop({
    type: String,
    enum: InternalDocumentStatus,
    default: InternalDocumentStatus.DRAFT,
  })
  status: InternalDocumentStatus;

  @Prop()
  date?: Date;

  @Prop()
  dueDate?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({
    type: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: Date,
        uploadedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  files: InternalDocumentFile[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InternalDocumentSchema =
  SchemaFactory.createForClass(InternalDocument);

InternalDocumentSchema.pre('validate', async function () {
  if (!this.documentNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as any;
    const prefix = `CN-${year}-`;

    const lastDoc = await Model.findOne(
      { documentNumber: { $regex: `^${prefix}` } },
      { documentNumber: 1 },
    ).sort({ documentNumber: -1 });

    let nextNumber = 1;
    if (lastDoc) {
      const lastNumber = parseInt(
        lastDoc.documentNumber.replace(prefix, ''),
        10,
      );
      nextNumber = lastNumber + 1;
    }

    this.documentNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }
});

InternalDocumentSchema.index({ category: 1, status: 1, createdAt: -1 });
InternalDocumentSchema.index({ isArchived: 1, archivedAt: -1 });
InternalDocumentSchema.index({ status: 1, createdAt: -1 });
InternalDocumentSchema.index({ counterparty: 'text', title: 'text', documentNumber: 'text' });
InternalDocumentSchema.index({ dueDate: 1 });
