import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { RequestType } from '../../request-statuses/schemas/request-status.schema';
import { RequestSource } from '../schemas/request.schema';

export class CreateRequestDto {
  @IsMongoId()
  clientId: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsOptional()
  @IsEnum(RequestSource)
  source?: RequestSource;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;
}
