import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum PersonnelDocumentStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under_review',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface PersonnelDocumentFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class PersonnelDocument extends Document {
  @Prop({ required: true })
  documentNumber: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'PersonnelDocumentCategory',
    required: true,
  })
  category: Types.ObjectId;

  @Prop()
  type?: string;

  @Prop({
    type: String,
    enum: PersonnelDocumentStatus,
    default: PersonnelDocumentStatus.DRAFT,
  })
  status: PersonnelDocumentStatus;

  @Prop()
  date?: Date;

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
  files: PersonnelDocumentFile[];

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

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PersonnelDocumentSchema =
  SchemaFactory.createForClass(PersonnelDocument);

PersonnelDocumentSchema.pre('validate', async function () {
  if (!this.documentNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as any;
    const prefix = `PR-${year}-`;

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

PersonnelDocumentSchema.index({ category: 1, status: 1, createdAt: -1 });
PersonnelDocumentSchema.index({ isArchived: 1, archivedAt: -1 });
PersonnelDocumentSchema.index({ status: 1, createdAt: -1 });
PersonnelDocumentSchema.index({
  title: 'text',
  documentNumber: 'text',
  description: 'text',
});
PersonnelDocumentSchema.index({ documentNumber: 1, companyId: 1 }, { unique: true });
