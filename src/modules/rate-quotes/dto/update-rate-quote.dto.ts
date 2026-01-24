import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateRateQuoteDto } from './create-rate-quote.dto';

export class UpdateRateQuoteDto extends PartialType(
  OmitType(CreateRateQuoteDto, ['requestId'] as const),
) {}
