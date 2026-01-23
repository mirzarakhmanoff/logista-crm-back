import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
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
  @ApiProperty({ description: 'Contact person name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Position', example: 'Logistics Manager', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ description: 'Email', example: 'john@company.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone', example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Is primary contact', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

class AddressDto {
  @ApiProperty({ description: 'Country', example: 'Germany' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'City', example: 'Berlin' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Street address', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'Is default address', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateClientDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Logistics GmbH' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Client type', enum: ClientType, example: ClientType.COMPANY })
  @IsEnum(ClientType)
  @IsNotEmpty()
  type: ClientType;

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

  @ApiProperty({ description: 'Credit limit', example: 50000, required: false })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30', required: false })
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
}
