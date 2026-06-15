import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateItemRequestDto {
  @IsString() @IsNotEmpty() requester: string;
  @IsString() @IsNotEmpty() itemId: string;
  @IsInt() @Min(1) quantity: number;
  @IsDateString() requestDate: string;
  @IsDateString() returnDate: string;
  @IsOptional() @IsString() reason?: string;
}
