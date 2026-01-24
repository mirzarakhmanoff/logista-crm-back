import { IsString, IsEnum, IsOptional } from 'class-validator';
import { CodeStatus } from '../schemas/issued-code.schema';

export class UpdateIssuedCodeDto {
  @IsOptional()
  @IsEnum(CodeStatus)
  status?: CodeStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
