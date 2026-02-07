import { PartialType } from '@nestjs/swagger';
import { CreatePersonnelDocumentCategoryDto } from './create-personnel-document-category.dto';

export class UpdatePersonnelDocumentCategoryDto extends PartialType(
  CreatePersonnelDocumentCategoryDto,
) {}
