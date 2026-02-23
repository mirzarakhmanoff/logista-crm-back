import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PersonnelCategoryType {
  INTERNAL = 'internal',
  REGULATORY = 'regulatory',
  REQUIRED = 'required',
  FUNCTIONAL = 'functional',
  COLLECTIVE = 'collective',
}

@Schema({ timestamps: true })
export class PersonnelDocumentCategory extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: PersonnelCategoryType,
    default: PersonnelCategoryType.INTERNAL,
  })
  type: PersonnelCategoryType;

  @Prop()
  color?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PersonnelDocumentCategorySchema =
  SchemaFactory.createForClass(PersonnelDocumentCategory);

PersonnelDocumentCategorySchema.index({ name: 1, companyId: 1 }, { unique: true });
PersonnelDocumentCategorySchema.index({ isArchived: 1 });
PersonnelDocumentCategorySchema.index({ type: 1 });
