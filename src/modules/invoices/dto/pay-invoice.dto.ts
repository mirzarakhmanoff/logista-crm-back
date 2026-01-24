import { IsNumber, Min } from 'class-validator';

export class PayInvoiceDto {
  @IsNumber()
  @Min(0)
  amount: number;
}
