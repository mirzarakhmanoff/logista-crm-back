import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import {
  DocumentStatus,
  DocumentPriority,
} from '../schemas/document.schema';

export class UpdateDocumentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Договор №001-2024',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Document description',
    example: 'Updated description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({
    description: 'Document priority',
    enum: DocumentPriority,
    required: false,
  })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiProperty({
    description: 'Document category/tag',
    example: 'Юридический',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'User ID assigned to this document',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({
    description: 'Client ID',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  client?: string;

  @ApiProperty({
    description: 'Due date',
    example: '2024-02-15T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @ApiProperty({
    description: 'Is document archived',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
