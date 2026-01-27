import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ClientType } from '../schemas/client.schema';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsString()
  clientNumber?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  inn?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
