import { IsString, IsEnum, IsOptional, IsMongoId, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestSource } from '../schemas/request.schema';

export class UpdateRequestDto {
  @IsOptional()
  @IsEnum(RequestSource)
  source?: RequestSource;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  cargoName?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  client?: string;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  manager?: string;
}
