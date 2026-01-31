import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @ApiPropertyOptional({ description: 'Guruh nomi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Qo\'shiladigan foydalanuvchilar' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  addParticipants?: string[];

  @ApiPropertyOptional({ description: 'Chiqariladigan foydalanuvchilar' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  removeParticipants?: string[];
}
