import { IsEnum } from 'class-validator';
import { RequestStatusKey } from '../schemas/request.schema';

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatusKey)
  toKey: RequestStatusKey;
}
