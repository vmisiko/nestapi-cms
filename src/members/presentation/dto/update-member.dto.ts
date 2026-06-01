import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MemberStatus, MemberType, ActivityStatus } from '../../domain/member';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string | null;

  @IsOptional()
  @IsEnum(MemberType)
  memberType?: MemberType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  activityStatus?: ActivityStatus;
}
