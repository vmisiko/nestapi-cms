import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  body: string;
}
