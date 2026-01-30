import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
  IsBoolean,
} from 'class-validator';

export class ReplyEmailDto {
  @ApiProperty({
    description: 'Original message ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  originalMessageId: string;

  @ApiPropertyOptional({ description: 'Additional CC recipients' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'Reply text body' })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({ description: 'Reply HTML body' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Reply to all recipients',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  replyAll?: boolean;
}
