import { ApiProperty } from '@nestjs/swagger';
import type { MessageTemplate } from '../../domain/message-template';

export class TemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(t: MessageTemplate) {
    this.id = t.id;
    this.name = t.name;
    this.body = t.body;
    this.createdBy = t.createdBy;
    this.createdAt = t.createdAt;
    this.updatedAt = t.updatedAt;
  }
}
