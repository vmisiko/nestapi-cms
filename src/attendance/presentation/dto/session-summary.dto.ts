import { ApiProperty } from '@nestjs/swagger';

export class SessionSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() sessionType: string;
  @ApiProperty() sessionDate: Date;
  @ApiProperty() present: number;
  @ApiProperty() absent: number;
  @ApiProperty() excused: number;
  @ApiProperty() adults: number;
  @ApiProperty() children: number;
  @ApiProperty() firstTimers: number;
}
