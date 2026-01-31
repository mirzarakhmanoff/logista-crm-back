import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetConversationsDto {
  @ApiPropertyOptional({ description: 'Ism yoki guruh nomi bo\'yicha qidirish' })
  @IsOptional()
  @IsString()
  search?: string;
}
