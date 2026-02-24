import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { CodeType, IssuedFor } from '../schemas/issued-code.schema';

export class CreateIssuedCodeDto {
  @IsMongoId()
  requestId: string;

  @IsString()
  code: string;

  @IsEnum(IssuedFor)
  issuedFor: IssuedFor;

  @IsOptional()
  @IsEnum(CodeType)
  codeType?: CodeType;

  @IsOptional()
  @IsString()
  notes?: string;
}
