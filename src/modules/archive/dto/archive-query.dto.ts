import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ArchiveCategory {
  ALL = 'all',
  CLIENTS = 'clients',
  REQUESTS = 'requests',
  DOCUMENTS = 'documents',
  INVOICES = 'invoices',
  SHIPMENTS = 'shipments',
  RATE_QUOTES = 'rate_quotes',
  ISSUED_CODES = 'issued_codes',
}

export class ArchiveQueryDto {
  @ApiPropertyOptional({
    enum: ArchiveCategory,
    default: ArchiveCategory.ALL,
    description: 'Filter by category/module',
  })
  @IsOptional()
  @IsEnum(ArchiveCategory)
  category?: ArchiveCategory = ArchiveCategory.ALL;

  @ApiPropertyOptional({
    description: 'Start date for archive filter (ISO format)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for archive filter (ISO format)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search query for name/title',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    default: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    default: 'archivedAt',
    description: 'Sort field',
  })
  @IsOptional()
  sortBy?: string = 'archivedAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ArchiveItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ArchiveCategory })
  category: ArchiveCategory;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  archivedAt: Date;

  @ApiPropertyOptional()
  archivedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class RestoreItemDto {
  @ApiProperty({ description: 'Item ID to restore' })
  id: string;

  @ApiProperty({ enum: ArchiveCategory, description: 'Category of the item' })
  @IsEnum(ArchiveCategory)
  category: ArchiveCategory;
}

export class BulkArchiveDto {
  @ApiProperty({
    type: [String],
    description: 'Array of item IDs to archive',
  })
  ids: string[];

  @ApiProperty({ enum: ArchiveCategory, description: 'Category of items' })
  @IsEnum(ArchiveCategory)
  category: ArchiveCategory;
}
