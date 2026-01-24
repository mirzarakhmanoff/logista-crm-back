import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { CodeType } from '../schemas/issued-code.schema';

export class CreateIssuedCodeDto {
  @IsMongoId()
  requestId: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsEnum(CodeType)
  codeType?: CodeType;

  @IsOptional()
  @IsString()
  notes?: string;
}
