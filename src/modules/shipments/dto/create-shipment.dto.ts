import { IsString, IsEnum, IsOptional, IsMongoId, IsDateString } from 'class-validator';
import { ShipmentStatus } from '../schemas/shipment.schema';

export class CreateShipmentDto {
  @IsMongoId()
  requestId: string;

  @IsOptional()
  @IsString()
  shipmentNo?: string;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  fromCity?: string;

  @IsOptional()
  @IsString()
  toCity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
