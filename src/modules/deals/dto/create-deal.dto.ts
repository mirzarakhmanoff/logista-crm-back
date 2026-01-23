import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsMongoId,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DealStage, DealPriority } from '../schemas/deal.schema';

class TemperatureControlDto {
  @ApiProperty({ description: 'Temperature control required', example: false })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: 'Minimum temperature (C)', required: false })
  @IsNumber()
  @IsOptional()
  min?: number;

  @ApiProperty({ description: 'Maximum temperature (C)', required: false })
  @IsNumber()
  @IsOptional()
  max?: number;
}

class RouteLocationDto {
  @ApiProperty({ description: 'Country', example: 'China' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'City', example: 'Shanghai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'Date', example: '2024-02-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  date: string;
}

class CargoDetailsDto {
  @ApiProperty({ description: 'Cargo description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Total weight in kg', example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  weight: number;

  @ApiProperty({ description: 'Total volume in m³', example: 45 })
  @IsNumber()
  @IsNotEmpty()
  volume: number;

  @ApiProperty({ description: 'Number of packages', required: false })
  @IsNumber()
  @IsOptional()
  packages?: number;

  @ApiProperty({ description: 'Number of pallets', required: false })
  @IsNumber()
  @IsOptional()
  pallets?: number;

  @ApiProperty({ description: 'Dangerous goods', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  dangerous?: boolean;

  @ApiProperty({ description: 'Temperature control', required: false })
  @ValidateNested()
  @Type(() => TemperatureControlDto)
  @IsOptional()
  temperature?: TemperatureControlDto;

  @ApiProperty({ description: 'Special instructions', required: false })
  @IsString()
  @IsOptional()
  specialInstructions?: string;
}

export class CreateDealDto {
  @ApiProperty({ description: 'Deal name', example: 'Shanghai-Berlin Electronics Shipment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Deal stage', enum: DealStage, required: false })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiProperty({ description: 'Deal priority', enum: DealPriority, required: false })
  @IsEnum(DealPriority)
  @IsOptional()
  priority?: DealPriority;

  @ApiProperty({ description: 'Client ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  client: string;

  @ApiProperty({ description: 'Origin location', type: RouteLocationDto })
  @ValidateNested()
  @Type(() => RouteLocationDto)
  @IsNotEmpty()
  origin: RouteLocationDto;

  @ApiProperty({ description: 'Destination location', type: RouteLocationDto })
  @ValidateNested()
  @Type(() => RouteLocationDto)
  @IsNotEmpty()
  destination: RouteLocationDto;

  @ApiProperty({ description: 'Cargo details', type: CargoDetailsDto })
  @ValidateNested()
  @Type(() => CargoDetailsDto)
  @IsNotEmpty()
  cargo: CargoDetailsDto;

  @ApiProperty({ description: 'Deal amount', example: 85000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Currency', example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Cost price', required: false })
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ description: 'Assigned user ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  assignedTo: string;

  @ApiProperty({ description: 'Expected completion date', required: false })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
