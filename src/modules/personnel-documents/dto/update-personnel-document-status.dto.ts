import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PersonnelDocumentStatus } from '../schemas/personnel-document.schema';

export class UpdatePersonnelDocumentStatusDto {
  @ApiProperty({
    description: 'New document status',
    enum: PersonnelDocumentStatus,
    example: PersonnelDocumentStatus.ACTIVE,
  })
  @IsEnum(PersonnelDocumentStatus)
  @IsNotEmpty()
  status: PersonnelDocumentStatus;
}
