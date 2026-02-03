import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class StatisticsRangeQueryDto {
  @ApiProperty({
    description: 'Start date (ISO format)',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO format)',
    example: '2024-12-31',
  })
  @IsDateString()
  endDate: string;
}
