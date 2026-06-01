import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MessageTargetGroup, MessageType } from '../../domain/message';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsEnum(MessageTargetGroup)
  targetGroup?: MessageTargetGroup;

  @IsOptional()
  @IsUUID()
  targetId?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;
}
