import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Client } from '../../clients/schemas/client.schema';

export enum DealStage {
  NEW_REQUEST = 'new_request',
  PART_ASSEMBLY = 'part_assembly',
  COST_CALCULATION = 'cost_calculation',
  DOCUMENT_PROCESSING = 'document_processing',
  LOADING = 'loading',
  IN_TRANSIT = 'in_transit',
  ON_DELIVERY = 'on_delivery',
  COMPLETED = 'completed',
  DECLINED = 'declined',
}

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface RouteLocation {
  country: string;
  city: string;
  address?: string;
  postalCode?: string;
  date: Date;
  actualDate?: Date;
}

export interface CargoDetails {
  description?: string;
  weight: number;
  volume: number;
  packages?: number;
  pallets?: number;
  dangerous?: boolean;
  temperature?: {
    required: boolean;
    min?: number;
    max?: number;
  };
  specialInstructions?: string;
}

export interface AttachedDocument {
  documentId: Types.ObjectId;
  documentNumber: string;
  title: string;
  addedAt: Date;
  addedBy: Types.ObjectId;
}

export interface StageHistoryEntry {
  stage: DealStage;
  changedAt: Date;
  changedBy: Types.ObjectId;
  comment?: string;
}

@Schema({ timestamps: true })
export class Deal extends Document {
  @Prop({ required: true, unique: true })
  dealNumber: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: DealStage, default: DealStage.NEW_REQUEST })
  stage: DealStage;

  @Prop({ type: String, enum: DealPriority, default: DealPriority.MEDIUM })
  priority: DealPriority;

  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  client: Types.ObjectId | Client;

  @Prop({
    type: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      address: String,
      postalCode: String,
      date: { type: Date, required: true },
      actualDate: Date,
    },
    required: true,
  })
  origin: RouteLocation;

  @Prop({
    type: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      address: String,
      postalCode: String,
      date: { type: Date, required: true },
      actualDate: Date,
    },
    required: true,
  })
  destination: RouteLocation;

  @Prop({
    type: {
      description: String,
      weight: { type: Number, required: true },
      volume: { type: Number, required: true },
      packages: Number,
      pallets: Number,
      dangerous: { type: Boolean, default: false },
      temperature: {
        required: { type: Boolean, default: false },
        min: Number,
        max: Number,
      },
      specialInstructions: String,
    },
    required: true,
  })
  cargo: CargoDetails;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  costPrice?: number;

  @Prop()
  margin?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedTo: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop({
    type: [
      {
        documentId: { type: Types.ObjectId, ref: 'Document' },
        documentNumber: String,
        title: String,
        addedAt: Date,
        addedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  attachedDocuments: AttachedDocument[];

  @Prop({
    type: [
      {
        stage: { type: String, enum: DealStage },
        changedAt: Date,
        changedBy: { type: Types.ObjectId, ref: 'User' },
        comment: String,
      },
    ],
    default: [],
  })
  stageHistory: StageHistoryEntry[];

  @Prop()
  expectedCompletionDate?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: 0 })
  position: number;
}

export const DealSchema = SchemaFactory.createForClass(Deal);

DealSchema.pre('validate', async function () {
  if (!this.dealNumber) {
    const year = new Date().getFullYear();
    const Model = this.constructor as any;
    const count = await Model.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.dealNumber = `DEAL-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

DealSchema.index({ stage: 1, position: 1 });
DealSchema.index({ client: 1 });
DealSchema.index({ assignedTo: 1 });
DealSchema.index({ 'origin.city': 1 });
DealSchema.index({ 'destination.city': 1 });
