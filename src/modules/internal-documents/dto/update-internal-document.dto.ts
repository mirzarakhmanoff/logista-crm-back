import { PartialType } from '@nestjs/swagger';
import { CreateInternalDocumentDto } from './create-internal-document.dto';

export class UpdateInternalDocumentDto extends PartialType(
  CreateInternalDocumentDto,
) {}
