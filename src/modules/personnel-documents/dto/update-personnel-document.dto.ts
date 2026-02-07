import { PartialType } from '@nestjs/swagger';
import { CreatePersonnelDocumentDto } from './create-personnel-document.dto';

export class UpdatePersonnelDocumentDto extends PartialType(
  CreatePersonnelDocumentDto,
) {}
