import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PersonnelCategoryType } from '../schemas/personnel-document-category.schema';

export class CreatePersonnelDocumentCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Приказы',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Category description',
    example:
      'Основные распорядительные документы по личному составу и основной деятельности.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category type',
    enum: PersonnelCategoryType,
    example: PersonnelCategoryType.INTERNAL,
    required: false,
  })
  @IsEnum(PersonnelCategoryType)
  @IsOptional()
  type?: PersonnelCategoryType;

  @ApiProperty({
    description: 'Category color',
    example: '#8B5CF6',
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;
}
