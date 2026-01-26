import { IsString, IsEnum, IsOptional, IsMongoId, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType, RequestStatusKey, RequestSource } from '../schemas/request.schema';

export class CreateRequestDto {
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @IsOptional()
  @IsString()
  client?: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsOptional()
  @IsEnum(RequestStatusKey)
  status?: RequestStatusKey;

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
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  manager?: string;
}
