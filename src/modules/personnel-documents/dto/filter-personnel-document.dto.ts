import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PersonnelDocumentStatus } from '../schemas/personnel-document.schema';

export class FilterPersonnelDocumentDto {
  @ApiProperty({ description: 'Filter by category ID', required: false })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: PersonnelDocumentStatus,
    required: false,
  })
  @IsEnum(PersonnelDocumentStatus)
  @IsOptional()
  status?: PersonnelDocumentStatus;

  @ApiProperty({ description: 'Filter by document type', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Search in title, description, or document number',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filter by assigned user', required: false })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ description: 'Filter archived documents', required: false })
  @IsOptional()
  isArchived?: boolean;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
