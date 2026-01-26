import { IsOptional, IsString, IsEnum, IsNumber, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType, RequestStatusKey } from '../schemas/request.schema';

export class FilterRequestDto {
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @IsOptional()
  @IsEnum(RequestStatusKey)
  statusKey?: RequestStatusKey;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
