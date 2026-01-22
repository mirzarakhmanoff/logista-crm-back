import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentStatus } from '../schemas/document.schema';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New document status',
    enum: DocumentStatus,
    example: DocumentStatus.UNDER_REVIEW,
  })
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status: DocumentStatus;
}
