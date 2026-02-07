import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsMongoId } from 'class-validator';
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
}
