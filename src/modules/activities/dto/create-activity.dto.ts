import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ActivityType } from '../schemas/activity.schema';
import type { ActivityMetadata } from '../schemas/activity.schema';

export class CreateActivityDto {
  @ApiProperty({
    description: 'Activity type',
    enum: ActivityType,
    example: ActivityType.STATUS_CHANGE,
  })
  @IsEnum(ActivityType)
  @IsNotEmpty()
  type: ActivityType;

  @ApiProperty({
    description: 'Activity content/description',
    example: 'Status changed from received to under_review',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Additional metadata for the activity',
    example: { oldStatus: 'received', newStatus: 'under_review' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: ActivityMetadata;
}
