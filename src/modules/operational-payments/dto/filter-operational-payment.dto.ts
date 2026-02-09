import { IsOptional, IsString, IsEnum, IsNumber, IsMongoId, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentCategory } from '../enums/payment-category.enum';

export class FilterOperationalPaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentCategory)
  category?: PaymentCategory;

  @IsOptional()
  @IsMongoId()
  responsibleId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCritical?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 25;
}
