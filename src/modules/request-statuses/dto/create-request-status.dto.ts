import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { RequestType } from '../schemas/request-status.schema';

export class CreateRequestStatusDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;
}
