import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsMongoId, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ClientType,
  ClientCategory,
  SupportLevel,
  ClientStatus,
} from '../schemas/client.schema';

export class FilterClientDto {
  @ApiProperty({ enum: ClientType, required: false })
  @IsEnum(ClientType)
  @IsOptional()
  type?: ClientType;

  @ApiProperty({ enum: ClientCategory, required: false })
  @IsEnum(ClientCategory)
  @IsOptional()
  category?: ClientCategory;

  @ApiProperty({ enum: SupportLevel, required: false })
  @IsEnum(SupportLevel)
  @IsOptional()
  supportLevel?: SupportLevel;

  @ApiProperty({ enum: ClientStatus, required: false })
  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;

  @ApiProperty({ description: 'Filter by assigned manager', required: false })
  @IsMongoId()
  @IsOptional()
  assignedManager?: string;

  @ApiProperty({ description: 'Search in name, email, phone', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filter archived clients', required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isArchived?: boolean;
}
