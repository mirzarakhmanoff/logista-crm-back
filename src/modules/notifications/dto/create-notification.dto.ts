import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
