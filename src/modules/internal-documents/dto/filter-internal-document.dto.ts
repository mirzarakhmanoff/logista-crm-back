import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsMongoId } from 'class-validator';
import { InternalDocumentStatus } from '../schemas/internal-document.schema';

export class FilterInternalDocumentDto {
  @ApiProperty({
    description: 'Filter by category ID',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: InternalDocumentStatus,
    required: false,
  })
  @IsEnum(InternalDocumentStatus)
  @IsOptional()
  status?: InternalDocumentStatus;

  @ApiProperty({
    description: 'Filter by document type',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Filter by counterparty',
    required: false,
  })
  @IsString()
  @IsOptional()
  counterparty?: string;

  @ApiProperty({
    description: 'Search in title, counterparty, or document number',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by assigned user',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({
    description: 'Filter archived documents',
    required: false,
  })
  @IsOptional()
  isArchived?: boolean;
}
