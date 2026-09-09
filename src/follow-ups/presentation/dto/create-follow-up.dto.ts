import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFollowUpDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsDateString()
  dueDate: string;
}
