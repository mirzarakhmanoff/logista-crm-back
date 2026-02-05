import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CategoryIcon {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  ACT = 'act',
  POWER_OF_ATTORNEY = 'power_of_attorney',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class DocumentCategory extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: CategoryIcon, default: CategoryIcon.OTHER })
  icon: CategoryIcon;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentCategorySchema =
  SchemaFactory.createForClass(DocumentCategory);

DocumentCategorySchema.index({ name: 1 }, { unique: true });
DocumentCategorySchema.index({ isArchived: 1 });
