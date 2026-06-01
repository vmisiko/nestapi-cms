import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFellowshipZoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
