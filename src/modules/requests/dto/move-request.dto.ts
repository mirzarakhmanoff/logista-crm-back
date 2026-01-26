import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { RequestStatusKey } from '../schemas/request.schema';

export class MoveRequestDto {
  @IsEnum(RequestStatusKey)
  toStatusKey: RequestStatusKey;

  @IsOptional()
  @IsNumber()
  position?: number;
}
