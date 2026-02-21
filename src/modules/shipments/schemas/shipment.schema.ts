import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ShipmentStatus {
  PLANNED = 'PLANNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'shipments' })
export class Shipment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Request', required: true })
  requestId: Types.ObjectId;

  @Prop()
  shipmentNo?: string;

  @Prop()
  carrier?: string;

  @Prop()
  vehicleNo?: string;

  @Prop()
  driverName?: string;

  @Prop()
  driverPhone?: string;

  @Prop()
  departureDate?: Date;

  @Prop()
  arrivalDate?: Date;

  @Prop()
  actualDepartureDate?: Date;

  @Prop()
  actualArrivalDate?: Date;

  @Prop({ type: String, enum: ShipmentStatus, default: ShipmentStatus.PLANNED })
  status: ShipmentStatus;

  @Prop()
  fromCity?: string;

  @Prop()
  toCity?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

ShipmentSchema.index({ requestId: 1, status: 1 });
ShipmentSchema.index({ status: 1, departureDate: 1 });
ShipmentSchema.index({ shipmentNo: 1 });
ShipmentSchema.index({ isArchived: 1, archivedAt: -1 });
