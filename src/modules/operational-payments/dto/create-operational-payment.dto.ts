import { IsString, IsNumber, IsMongoId, IsDateString, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { PaymentCategory } from '../enums/payment-category.enum';

export class CreateOperationalPaymentDto {
  @IsDateString()
  date: string;

  @IsString()
  counterpartyName: string;

  @IsEnum(PaymentCategory)
  counterpartyCategory: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsMongoId()
  responsibleId: string;

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
