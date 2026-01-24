import { IsString, IsNumber, IsOptional } from 'class-validator';

export class MoveRequestDto {
  @IsString()
  toStatusKey: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}
