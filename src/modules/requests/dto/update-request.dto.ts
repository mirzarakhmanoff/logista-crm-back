import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { RequestSource } from '../schemas/request.schema';

export class UpdateRequestDto {
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
