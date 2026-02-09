import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateOperationalPaymentDto {
  @IsDateString()
  date: string;

  @IsString()
  counterpartyName: string;

  @IsString()
  counterpartyCategory: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

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
