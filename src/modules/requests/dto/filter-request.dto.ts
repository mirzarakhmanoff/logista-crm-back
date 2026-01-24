import { IsOptional, IsString, IsEnum, IsNumber, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestType } from '../../request-statuses/schemas/request-status.schema';

export class FilterRequestDto {
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @IsOptional()
  @IsString()
  statusKey?: string;

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
