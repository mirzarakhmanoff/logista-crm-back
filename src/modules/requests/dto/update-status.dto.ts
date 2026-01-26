import { IsEnum } from 'class-validator';
import { RequestStatusKey } from '../schemas/request.schema';

export class UpdateStatusDto {
  @IsEnum(RequestStatusKey)
  toKey: RequestStatusKey;
}
