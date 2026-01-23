import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsMongoId, IsArray } from 'class-validator';
import { DealStage } from '../schemas/deal.schema';

export class MoveDealKanbanDto {
  @ApiProperty({ description: 'Target stage', enum: DealStage })
  @IsEnum(DealStage)
  @IsNotEmpty()
  targetStage: DealStage;

  @ApiProperty({ description: 'New position in the stage', example: 0 })
  @IsNumber()
  @IsNotEmpty()
  position: number;
}

export class ReorderDealsDto {
  @ApiProperty({ description: 'Deal IDs in new order', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  dealIds: string[];

  @ApiProperty({ description: 'Stage to reorder', enum: DealStage })
  @IsEnum(DealStage)
  @IsNotEmpty()
  stage: DealStage;
}
