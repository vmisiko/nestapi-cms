import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsInt()
  @IsNotEmpty()
  adjustment: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
