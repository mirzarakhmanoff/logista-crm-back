import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import { InternalDocumentStatus } from '../schemas/internal-document.schema';

export class CreateInternalDocumentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Договор поставки оборудования',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Document description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Counterparty name',
    example: "ООО 'ТехноСнаб'",
    required: false,
  })
  @IsString()
  @IsOptional()
  counterparty?: string;

  @ApiProperty({
    description: 'Document type (e.g. Поставка, Аренда, Услуги)',
    example: 'Поставка',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Amount',
    example: 1250000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'Currency symbol',
    example: '₽',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Amount period (e.g. /мес)',
    example: '₽/мес',
    required: false,
  })
  @IsString()
  @IsOptional()
  amountPeriod?: string;

  @ApiProperty({
    description: 'Document status',
    enum: InternalDocumentStatus,
    example: InternalDocumentStatus.DRAFT,
    required: false,
  })
  @IsEnum(InternalDocumentStatus)
  @IsOptional()
  status?: InternalDocumentStatus;

  @ApiProperty({
    description: 'Document date',
    example: '2024-01-12T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Due date / expiration date',
    example: '2025-01-12T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Assigned user ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;
}
