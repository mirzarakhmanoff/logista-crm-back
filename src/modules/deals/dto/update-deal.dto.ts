import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
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
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  min?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max?: number;
}

class RouteLocationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  actualDate?: string;
}

class CargoDetailsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  volume?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  packages?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  pallets?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  dangerous?: boolean;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => TemperatureControlDto)
  @IsOptional()
  temperature?: TemperatureControlDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specialInstructions?: string;
}

export class UpdateDealDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: DealStage, required: false })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiProperty({ enum: DealPriority, required: false })
  @IsEnum(DealPriority)
  @IsOptional()
  priority?: DealPriority;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  client?: string;

  @ApiProperty({ type: RouteLocationDto, required: false })
  @ValidateNested()
  @Type(() => RouteLocationDto)
  @IsOptional()
  origin?: RouteLocationDto;

  @ApiProperty({ type: RouteLocationDto, required: false })
  @ValidateNested()
  @Type(() => RouteLocationDto)
  @IsOptional()
  destination?: RouteLocationDto;

  @ApiProperty({ type: CargoDetailsDto, required: false })
  @ValidateNested()
  @Type(() => CargoDetailsDto)
  @IsOptional()
  cargo?: CargoDetailsDto;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  margin?: number;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
