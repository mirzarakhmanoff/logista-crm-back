import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'Account ID to send from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'Recipient email addresses',
    example: ['client@example.com'],
  })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiPropertyOptional({
    description: 'CC recipients',
    example: ['manager@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC recipients' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Quote for shipment #12345',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({ description: 'HTML body' })
  @IsOptional()
  @IsString()
  htmlBody?: string;
}
