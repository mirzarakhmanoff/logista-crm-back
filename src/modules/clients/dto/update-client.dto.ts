import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ClientType,
  ClientCategory,
  SupportLevel,
  ClientStatus,
} from '../schemas/client.schema';

class ContactPersonDto {
  @ApiProperty({ description: 'Contact person name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Position', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Is primary contact', required: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

class AddressDto {
  @ApiProperty({ description: 'Country', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Street address', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'Is default address', required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateClientDto {
  @ApiProperty({ description: 'Company name', required: false })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ description: 'Client type', enum: ClientType, required: false })
  @IsEnum(ClientType)
  @IsOptional()
  type?: ClientType;

  @ApiProperty({ description: 'Client category', enum: ClientCategory, required: false })
  @IsEnum(ClientCategory)
  @IsOptional()
  category?: ClientCategory;

  @ApiProperty({ description: 'Support level', enum: SupportLevel, required: false })
  @IsEnum(SupportLevel)
  @IsOptional()
  supportLevel?: SupportLevel;

  @ApiProperty({ description: 'Client status', enum: ClientStatus, required: false })
  @IsEnum(ClientStatus)
  @IsOptional()
  status?: ClientStatus;

  @ApiProperty({ description: 'Tax ID', required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ description: 'Registration number', required: false })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty({ description: 'Company email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Company phone', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Website', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Contact persons', type: [ContactPersonDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPersonDto)
  @IsOptional()
  contacts?: ContactPersonDto[];

  @ApiProperty({ description: 'Addresses', type: [AddressDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsOptional()
  addresses?: AddressDto[];

  @ApiProperty({ description: 'Credit limit', required: false })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ description: 'Current balance', required: false })
  @IsNumber()
  @IsOptional()
  currentBalance?: number;

  @ApiProperty({ description: 'Payment terms', required: false })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ description: 'Assigned manager ID', required: false })
  @IsMongoId()
  @IsOptional()
  assignedManager?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Is archived', required: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
