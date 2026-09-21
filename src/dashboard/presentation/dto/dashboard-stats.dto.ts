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
  @ApiProperty() firstTimeVisitors: number;
  @ApiProperty({ type: MemberStatusBreakdown }) byStatus: MemberStatusBreakdown;
  @ApiProperty({ type: MemberTypeBreakdown }) byType: MemberTypeBreakdown;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description:
      'Member counts keyed by stored age group; "unknown" when unset.',
  })
  byAgeGroup: Record<string, number>;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'Counts keyed male, female, unspecified.',
  })
  byGender: Record<string, number>;
  @ApiProperty() online: number;
  @ApiProperty() international: number;
}

class ZoneSummary {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() fellowshipCount: number;
  @ApiProperty() activeFellowships: number;
  @ApiProperty() memberCount: number;
  @ApiProperty({ type: [String] }) meetingDays: string[];
}

class FellowshipStats {
  @ApiProperty() total: number;
  @ApiProperty() active: number;
  @ApiProperty() inactive: number;
  @ApiProperty({
    type: [ZoneSummary],
    description: 'Per-zone rollup; zones with no fellowships are omitted.',
  })
  zones: ZoneSummary[];
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

class RecentMessage {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() type: string;
  @ApiProperty() targetGroup: string;
  @ApiProperty({ nullable: true, type: Date }) sentAt: Date | null;
  @ApiProperty({
    description: 'Percent of this message deliveries that were delivered.',
  })
  deliveryRate: number;
}

class MessagingStats {
  @ApiProperty() totalMessages: number;
  @ApiProperty() sent: number;
  @ApiProperty() drafts: number;
  @ApiProperty() totalDeliveries: number;
  @ApiProperty() delivered: number;
  @ApiProperty() sentDeliveries: number;
  @ApiProperty() pendingDeliveries: number;
  @ApiProperty() failedDeliveries: number;
  @ApiProperty({ type: [RecentMessage] }) recent: RecentMessage[];
}

class InventoryStats {
  @ApiProperty() totalItems: number;
  @ApiProperty() lowStockItems: number;
  @ApiProperty() pendingDamageReports: number;
}

class RecentFollowUpAttempt {
  @ApiProperty() id: string;
  @ApiProperty() taskId: string;
  @ApiProperty() taskTitle: string;
  @ApiProperty() memberName: string;
  @ApiProperty() contactMethod: string;
  @ApiProperty() outcome: string;
  @ApiProperty() contactedAt: Date;
}

class FollowUpStats {
  @ApiProperty() open: number;
  @ApiProperty() overdue: number;
  @ApiProperty() completed: number;
  @ApiProperty() unassigned: number;
  @ApiProperty() completionRate: number;
  @ApiProperty({ type: [RecentFollowUpAttempt] })
  recentAttempts: RecentFollowUpAttempt[];
}

class LowStockItem {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() availableQty: number;
  @ApiProperty() totalQty: number;
}

class PendingDamageItem {
  @ApiProperty() id: string;
  @ApiProperty() itemName: string;
  @ApiProperty() severity: string;
  @ApiProperty() quantityAffected: number;
}

class FellowshipWithoutLeader {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() zoneName: string;
}

class DepartmentBelowTarget {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() target: number;
  @ApiProperty() memberCount: number;
}

class AttentionStats {
  @ApiProperty({ type: [LowStockItem] }) lowStock: LowStockItem[];
  @ApiProperty({ type: [PendingDamageItem] })
  pendingDamage: PendingDamageItem[];
  @ApiProperty({ type: [FellowshipWithoutLeader] })
  fellowshipsWithoutLeader: FellowshipWithoutLeader[];
  @ApiProperty({ type: [DepartmentBelowTarget] })
  departmentsBelowTarget: DepartmentBelowTarget[];
}

export class DashboardStatsDto {
  @ApiProperty({ type: MemberStats }) members: MemberStats;
  @ApiProperty({ type: FellowshipStats }) fellowships: FellowshipStats;
  @ApiProperty({ type: DepartmentStats }) departments: DepartmentStats;
  @ApiProperty({ type: AttendanceStats }) attendance: AttendanceStats;
  @ApiProperty({ type: MessagingStats }) messaging: MessagingStats;
  @ApiProperty({ type: InventoryStats }) inventory: InventoryStats;
  @ApiProperty({ type: FollowUpStats }) followUps: FollowUpStats;
  @ApiProperty({
    type: AttentionStats,
    description:
      'Short lists (max 5 each) of the records behind dashboard alerts.',
  })
  attention: AttentionStats;
}
