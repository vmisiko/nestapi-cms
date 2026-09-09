import { PartialType } from '@nestjs/swagger';
import { CreateFollowUpDto } from './create-follow-up.dto';
import { FollowUpStatus } from '../../domain/follow-up';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateFollowUpDto extends PartialType(CreateFollowUpDto) {
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;
}
