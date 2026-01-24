import { IsString, IsEnum, IsOptional, IsMongoId, IsObject } from 'class-validator';

export class CreateActivityLogDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
