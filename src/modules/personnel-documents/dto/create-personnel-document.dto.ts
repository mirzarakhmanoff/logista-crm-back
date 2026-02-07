import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsDateString,
} from 'class-validator';
import { PersonnelDocumentStatus } from '../schemas/personnel-document.schema';

export class CreatePersonnelDocumentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'О приеме на работу Иванова И.И.',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Document description',
    example: 'Приказ о приеме на должность менеджера по продажам',
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
    description: 'Document type (e.g. PDF, DOCX)',
    example: 'PDF',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Document status',
    enum: PersonnelDocumentStatus,
    example: PersonnelDocumentStatus.DRAFT,
    required: false,
  })
  @IsEnum(PersonnelDocumentStatus)
  @IsOptional()
  status?: PersonnelDocumentStatus;

  @ApiProperty({
    description: 'Document date',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Assigned user ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  assignedTo?: string;
}
