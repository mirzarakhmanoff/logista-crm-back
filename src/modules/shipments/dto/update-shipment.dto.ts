import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateShipmentDto } from './create-shipment.dto';

export class UpdateShipmentDto extends PartialType(
  OmitType(CreateShipmentDto, ['requestId'] as const),
) {}
