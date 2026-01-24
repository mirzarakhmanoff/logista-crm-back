import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { InvoiceStatus } from '../schemas/invoice.schema';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
