import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MessageType } from '../interfaces/chat.interfaces';

export class SendMessageDto {
  @ApiProperty({ description: 'Suhbat ID' })
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'Xabar matni', example: 'Salom!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Javob berilayotgan xabar ID' })
  @IsOptional()
  @IsMongoId()
  replyTo?: string;
}
