import { IsString, IsNumber, IsOptional, IsMongoId, IsDateString, IsEnum } from 'class-validator';
import { InvoiceStatus } from '../schemas/invoice.schema';

export class CreateInvoiceDto {
  @IsMongoId()
  requestId: string;

  @IsString()
  number: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
