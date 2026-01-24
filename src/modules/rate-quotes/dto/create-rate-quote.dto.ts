import { IsString, IsNumber, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { RateQuoteStatus } from '../schemas/rate-quote.schema';

export class CreateRateQuoteDto {
  @IsMongoId()
  requestId: string;

  @IsString()
  fromCity: string;

  @IsString()
  toCity: string;

  @IsOptional()
  @IsString()
  cargoName?: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  @IsNumber()
  cost: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  margin?: number;

  @IsOptional()
  @IsEnum(RateQuoteStatus)
  status?: RateQuoteStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
