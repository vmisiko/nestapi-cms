import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MessageTargetGroup, MessageType } from '../../domain/message';

export class CreateMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsEnum(MessageTargetGroup)
  targetGroup: MessageTargetGroup;

  @IsOptional()
  @IsUUID()
  targetId?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;
}
