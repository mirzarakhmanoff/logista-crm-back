import { IsString, IsDateString, IsOptional } from 'class-validator';

export class MarkPaidDto {
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
