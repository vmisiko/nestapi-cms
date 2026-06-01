import { ApiProperty } from '@nestjs/swagger';

class MemberStatusBreakdown {
  @ApiProperty() guest: number;
  @ApiProperty() member: number;
  @ApiProperty() leader: number;
}

class MemberTypeBreakdown {
  @ApiProperty() adult: number;
  @ApiProperty() child: number;
}

class MemberStats {
  @ApiProperty() total: number;
  @ApiProperty() active: number;
  @ApiProperty() inactive: number;
  @ApiProperty({ type: MemberStatusBreakdown }) byStatus: MemberStatusBreakdown;
  @ApiProperty({ type: MemberTypeBreakdown }) byType: MemberTypeBreakdown;
}

class FellowshipStats {
  @ApiProperty() total: number;
  @ApiProperty() active: number;
  @ApiProperty() inactive: number;
}

class DepartmentStats {
  @ApiProperty() total: number;
}

class LastSessionStats {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() sessionDate: Date;
  @ApiProperty() totalRecorded: number;
  @ApiProperty() present: number;
  @ApiProperty() absent: number;
  @ApiProperty() excused: number;
  @ApiProperty() attendanceRate: number;
}

class AttendanceStats {
  @ApiProperty() totalSessions: number;
  @ApiProperty({ nullable: true, type: LastSessionStats })
  lastSession: LastSessionStats | null;
}

class MessagingStats {
  @ApiProperty() totalMessages: number;
  @ApiProperty() sent: number;
  @ApiProperty() drafts: number;
  @ApiProperty() totalDeliveries: number;
  @ApiProperty() delivered: number;
}

class InventoryStats {
  @ApiProperty() totalItems: number;
  @ApiProperty() lowStockItems: number;
  @ApiProperty() pendingDamageReports: number;
}

export class DashboardStatsDto {
  @ApiProperty({ type: MemberStats }) members: MemberStats;
  @ApiProperty({ type: FellowshipStats }) fellowships: FellowshipStats;
  @ApiProperty({ type: DepartmentStats }) departments: DepartmentStats;
  @ApiProperty({ type: AttendanceStats }) attendance: AttendanceStats;
  @ApiProperty({ type: MessagingStats }) messaging: MessagingStats;
  @ApiProperty({ type: InventoryStats }) inventory: InventoryStats;
}
