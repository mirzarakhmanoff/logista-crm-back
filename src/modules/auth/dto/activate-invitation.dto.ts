import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ActivateInvitationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'MyNewPassword123', description: 'Yangi parol (ixtiyoriy)' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'ABC123', description: 'One-time invitation code' })
  @IsString()
  @IsNotEmpty()
  invitationCode: string;
}

export class ActivateByCodeDto {
  @ApiProperty({ example: 'ABC123', description: 'One-time invitation code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
