import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsMongoId,
  IsBoolean,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DealStage, DealPriority } from '../schemas/deal.schema';

export class FilterDealDto {
  @ApiProperty({ enum: DealStage, required: false })
  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @ApiProperty({ enum: DealPriority, required: false })
  @IsEnum(DealPriority)
  @IsOptional()
  priority?: DealPriority;

  @ApiProperty({ description: 'Filter by client ID', required: false })
  @IsMongoId()
  @IsOptional()
  client?: string;

  @ApiProperty({ description: 'Filter by assigned user', required: false })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ description: 'Search in name, deal number', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filter by origin city', required: false })
  @IsString()
  @IsOptional()
  originCity?: string;

  @ApiProperty({ description: 'Filter by destination city', required: false })
  @IsString()
  @IsOptional()
  destinationCity?: string;

  @ApiProperty({ description: 'Minimum amount', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @ApiProperty({ description: 'Maximum amount', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @ApiProperty({ description: 'Date from', required: false })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiProperty({ description: 'Date to', required: false })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiProperty({ description: 'Filter archived deals', required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isArchived?: boolean;
}
