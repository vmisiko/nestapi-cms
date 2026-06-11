import { ApiProperty } from '@nestjs/swagger';
import type { Message } from '../../domain/message';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  targetGroup: string;

  @ApiProperty({ nullable: true })
  targetId: string | null;

  @ApiProperty({ type: [String] })
  memberIds: string[];

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  scheduledAt: Date | null;

  @ApiProperty({ nullable: true })
  sentAt: Date | null;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(m: Message) {
    this.id = m.id;
    this.title = m.title;
    this.body = m.body;
    this.type = m.type;
    this.targetGroup = m.targetGroup;
    this.targetId = m.targetId;
    this.memberIds = m.memberIds;
    this.status = m.status;
    this.scheduledAt = m.scheduledAt;
    this.sentAt = m.sentAt;
    this.createdBy = m.createdBy;
    this.createdAt = m.createdAt;
    this.updatedAt = m.updatedAt;
  }
}
