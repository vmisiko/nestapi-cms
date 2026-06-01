import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUUID()
  headId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  memberTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualBudget?: number;

  @IsOptional()
  @IsString()
  description?: string | null;
}
