import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AgeGroup, ChurchRole, Gender } from '../../../core/domain/enums';

export class BulkMemberRowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsNumber()
  rowIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string;

  @IsOptional()
  @IsEnum(ChurchRole)
  churchRole?: ChurchRole;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  isInternational?: boolean;

  @IsOptional()
  @IsBoolean()
  wantsUpdates?: boolean;
}

export class BulkImportMembersDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BulkMemberRowDto)
  rows: BulkMemberRowDto[];
}
