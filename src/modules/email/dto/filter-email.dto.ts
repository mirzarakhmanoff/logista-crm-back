import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailDirection, EmailStatus } from '../interfaces/email.interfaces';

export class FilterEmailDto {
  @ApiPropertyOptional({ description: 'Search in subject and body' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by account ID' })
  @IsOptional()
  @IsMongoId()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by direction',
    enum: EmailDirection,
  })
  @IsOptional()
  @IsEnum(EmailDirection)
  direction?: EmailDirection;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: EmailStatus,
  })
  @IsOptional()
  @IsEnum(EmailStatus)
  status?: EmailStatus;

  @ApiPropertyOptional({
    description: 'Filter by folder',
    example: 'INBOX',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Filter by linked client ID' })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by linked request ID' })
  @IsOptional()
  @IsMongoId()
  requestId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
