import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class InviteUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MANAGER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'MyPassword123',
    description: 'Optional. If not provided, a random password will be generated.',
  })
  @ValidateIf((o) => o.password !== undefined && o.password !== '')
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    example: '685abc123def456',
    description: 'Faqat SUPER_ADMIN uchun: userni qaysi kompaniyaga biriktirish kerak',
  })
  @IsString()
  @IsOptional()
  targetCompanyId?: string;
}
