import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DealStage } from '../schemas/deal.schema';

export class UpdateDealStageDto {
  @ApiProperty({ description: 'New deal stage', enum: DealStage })
  @IsEnum(DealStage)
  @IsNotEmpty()
  stage: DealStage;

  @ApiProperty({ description: 'Comment for stage change', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
