import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailProvider } from '../interfaces/email.interfaces';

class ImapConfigDto {
  @ApiProperty({ example: 'imap.gmail.com' })
  @IsString()
  host: string;

  @ApiProperty({ example: 993 })
  @IsNumber()
  port: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  secure: boolean;
}

class SmtpConfigDto {
  @ApiProperty({ example: 'smtp.gmail.com' })
  @IsString()
  host: string;

  @ApiProperty({ example: 465 })
  @IsNumber()
  port: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  secure: boolean;
}

class CredentialsDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  user: string;

  @ApiPropertyOptional({ example: 'app-password-here' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class CreateEmailAccountDto {
  @ApiProperty({
    description: 'Account display name',
    example: 'Corporate Inbox',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'info@logistatrans.uz',
  })
  @IsEmail()
  @IsNotEmpty()
  emailAddress: string;

  @ApiProperty({
    description: 'Email provider',
    enum: EmailProvider,
    example: EmailProvider.CORPORATE,
  })
  @IsEnum(EmailProvider)
  provider: EmailProvider;

  @ApiPropertyOptional({ description: 'IMAP connection config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImapConfigDto)
  imapConfig?: ImapConfigDto;

  @ApiPropertyOptional({ description: 'SMTP connection config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtpConfig?: SmtpConfigDto;

  @ApiProperty({ description: 'Authentication credentials' })
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials: CredentialsDto;

  @ApiPropertyOptional({
    description: 'Enable background sync',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;
}
