import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsMongoId } from 'class-validator';
import {
  DocumentStatus,
  DocumentType,
  DocumentPriority,
} from '../schemas/document.schema';

export class FilterDocumentDto {
  @ApiProperty({
    description: 'Filter by document type',
    enum: DocumentType,
    required: false,
  })
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @ApiProperty({
    description: 'Filter by status',
    enum: DocumentStatus,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({
    description: 'Filter by priority',
    enum: DocumentPriority,
    required: false,
  })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiProperty({
    description: 'Filter by assigned user ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({
    description: 'Filter by category/tag',
    example: 'Счет',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Search in title, description, or document number',
    example: 'договор',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter archived documents',
    example: false,
    required: false,
  })
  @IsOptional()
  isArchived?: boolean;
}
