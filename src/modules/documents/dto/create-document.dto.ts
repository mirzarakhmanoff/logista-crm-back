import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import {
  DocumentStatus,
  DocumentType,
  DocumentPriority,
} from '../schemas/document.schema';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Договор №001-2024',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Document description',
    example: 'Счет-фактура за 4 квартал 2024 года на доставку в Берлинский терминал',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
    example: DocumentStatus.RECEIVED,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({
    description: 'Document priority',
    enum: DocumentPriority,
    example: DocumentPriority.MEDIUM,
    required: false,
  })
  @IsEnum(DocumentPriority)
  @IsOptional()
  priority?: DocumentPriority;

  @ApiProperty({
    description: 'Document category/tag',
    example: 'Счет',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: DocumentType.INCOMING,
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty({
    description: 'User ID assigned to this document',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  assignedTo: string;

  @ApiProperty({
    description: 'Client ID (optional)',
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
}
