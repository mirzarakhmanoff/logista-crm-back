import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum ClientType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
}

export enum ClientCategory {
  LOGISTICS = 'logistics',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  WHOLESALE = 'wholesale',
  ECOMMERCE = 'ecommerce',
  AGRICULTURE = 'agriculture',
  AUTOMOTIVE = 'automotive',
  PHARMACEUTICAL = 'pharmaceutical',
  FOOD_BEVERAGE = 'food_beverage',
  OTHER = 'other',
}

export enum SupportLevel {
  STANDARD = 'standard',
  PRIORITY = 'priority',
  VIP = 'vip',
}

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  POTENTIAL = 'potential',
  ARCHIVED = 'archived',
}

export interface ContactPerson {
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface ClientAddress {
  country: string;
  city: string;
  street?: string;
  postalCode?: string;
  isDefault: boolean;
}

@Schema({ timestamps: true })
export class Client extends Document {
  @Prop({ required: true, unique: true })
  clientNumber: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ type: String, enum: ClientType, required: true })
  type: ClientType;

  @Prop({ type: String, enum: ClientCategory, default: ClientCategory.OTHER })
  category: ClientCategory;

  @Prop({ type: String, enum: SupportLevel, default: SupportLevel.STANDARD })
  supportLevel: SupportLevel;

  @Prop({ type: String, enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @Prop()
  taxId?: string;

  @Prop()
  registrationNumber?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  website?: string;

  @Prop({
    type: [
      {
        name: String,
        position: String,
        email: String,
        phone: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  contacts: ContactPerson[];

  @Prop({
    type: [
      {
        country: String,
        city: String,
        street: String,
        postalCode: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  addresses: ClientAddress[];

  @Prop({ default: 0 })
  creditLimit: number;

  @Prop({ default: 0 })
  currentBalance: number;

  @Prop()
  paymentTerms?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedManager?: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isArchived: boolean;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.pre('validate', async function () {
  if (!this.clientNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as any;
    const count = await Model.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.clientNumber = `CLT-${year}-${String(count + 1).padStart(3, '0')}`;
  }
});

ClientSchema.index({ companyName: 'text', email: 'text', phone: 'text' });
ClientSchema.index({ status: 1 });
ClientSchema.index({ assignedManager: 1 });
