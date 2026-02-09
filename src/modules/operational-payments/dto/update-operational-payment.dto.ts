import { IsString, IsNumber, IsMongoId, IsDateString, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { PaymentCategory } from '../enums/payment-category.enum';

export class UpdateOperationalPaymentDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsEnum(PaymentCategory)
  counterpartyCategory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsMongoId()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;
}
