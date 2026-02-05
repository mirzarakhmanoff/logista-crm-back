import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { InternalDocumentStatus } from '../schemas/internal-document.schema';

export class UpdateInternalDocumentStatusDto {
  @ApiProperty({
    description: 'New document status',
    enum: InternalDocumentStatus,
    example: InternalDocumentStatus.ACTIVE,
  })
  @IsEnum(InternalDocumentStatus)
  @IsNotEmpty()
  status: InternalDocumentStatus;
}
