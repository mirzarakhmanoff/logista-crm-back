import { IsString, IsEnum, IsOptional } from 'class-validator';
import { CodeStatus, IssuedFor } from '../schemas/issued-code.schema';

export class UpdateIssuedCodeDto {
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @IsOptional()
  @IsEnum(IssuedFor)
  issuedFor?: IssuedFor;

  @IsOptional()
  @IsString()
  notes?: string;
}
