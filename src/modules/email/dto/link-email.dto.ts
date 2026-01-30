import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsMongoId } from 'class-validator';

export enum LinkEntityType {
  CLIENT = 'CLIENT',
  REQUEST = 'REQUEST',
}

export class LinkEmailDto {
  @ApiProperty({
    description: 'Entity type to link',
    enum: LinkEntityType,
  })
  @IsEnum(LinkEntityType)
  entityType: LinkEntityType;

  @ApiProperty({
    description: 'Entity ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  entityId: string;
}
