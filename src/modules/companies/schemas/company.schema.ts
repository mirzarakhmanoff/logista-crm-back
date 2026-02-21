import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Company extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  logo?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ slug: 1 }, { unique: true });
CompanySchema.index({ isActive: 1 });
