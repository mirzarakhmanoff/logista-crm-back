import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum DocumentStatus {
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  SENT = 'sent',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum DocumentType {

  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

export enum DocumentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface DocumentFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Document extends MongooseDocument {
  @Prop({ required: true })
  documentNumber: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: DocumentStatus, default: DocumentStatus.RECEIVED })
  status: DocumentStatus;

  @Prop({ type: String, enum: DocumentPriority, default: DocumentPriority.MEDIUM })
  priority: DocumentPriority;

  @Prop()
  category?: string;

  @Prop({ type: String, enum: DocumentType, required: true })
  type: DocumentType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedTo: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'Client' })
  client?: Types.ObjectId;

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
  files: DocumentFile[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

// Auto-generate document number before validation
DocumentSchema.pre('validate', async function () {
  if (!this.documentNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as any;
    const prefix = `DOC-${year}-`;

    const lastDoc = await Model.findOne(
      { documentNumber: { $regex: `^${prefix}` } },
      { documentNumber: 1 },
    ).sort({ documentNumber: -1 });

    let nextNumber = 1;
    if (lastDoc) {
      const lastNumber = parseInt(lastDoc.documentNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    this.documentNumber = `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }
});

DocumentSchema.index({ isArchived: 1, archivedAt: -1 });
DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ documentNumber: 1, companyId: 1 }, { unique: true });
