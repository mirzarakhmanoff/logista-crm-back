import { PartialType } from '@nestjs/mapped-types';
import { CreateRequestStatusDto } from './create-request-status.dto';

export class UpdateRequestStatusDto extends PartialType(CreateRequestStatusDto) {}
