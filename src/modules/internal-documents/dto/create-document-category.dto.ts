import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryIcon } from '../schemas/document-category.schema';

export class CreateDocumentCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Договора с контрагентами',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Category description',
    example:
      'Юридические соглашения, приложения и дополнительные соглашения с внешними поставщиками и партнерами.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category icon type',
    enum: CategoryIcon,
    example: CategoryIcon.CONTRACT,
    required: false,
  })
  @IsEnum(CategoryIcon)
  @IsOptional()
  icon?: CategoryIcon;

  @ApiProperty({
    description: 'Category color',
    example: '#8B5CF6',
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;
}
