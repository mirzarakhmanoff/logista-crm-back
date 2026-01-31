import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ConversationType } from '../interfaces/chat.interfaces';

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationType, example: 'private' })
  @IsEnum(ConversationType)
  @IsNotEmpty()
  type: ConversationType;

  @ApiProperty({
    description: 'Ishtirokchi ID lari (joriy foydalanuvchi avtomatik qo\'shiladi)',
    example: ['507f1f77bcf86cd799439011'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  participantIds: string[];

  @ApiPropertyOptional({ description: 'Guruh nomi (group uchun majburiy)' })
  @IsOptional()
  @IsString()
  name?: string;
}
