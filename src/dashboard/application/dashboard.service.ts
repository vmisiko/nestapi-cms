import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import { FellowshipZoneEntity } from '../../fellowship-zones/infrastructure/fellowship-zone.entity';
import { DepartmentEntity } from '../../departments/infrastructure/department.entity';
import { AttendanceSessionEntity } from '../../attendance/infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from '../../attendance/infrastructure/attendance-record.entity';
import { MessageEntity } from '../../messaging/infrastructure/message.entity';
import { MessageDeliveryEntity } from '../../messaging/infrastructure/message-delivery.entity';
import { InventoryItemEntity } from '../../inventory/infrastructure/inventory-item.entity';
import { DamageReportEntity } from '../../inventory/infrastructure/damage-report.entity';
import { FollowUpEntity } from '../../follow-ups/infrastructure/follow-up.entity';
import { FollowUpAttemptEntity } from '../../follow-ups/infrastructure/follow-up-attempt.entity';
import {
  ActivityStatus,
  ChurchRole,
  MemberStatus,
  MemberType,
} from '../../members/domain/member';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { MessageStatus } from '../../messaging/domain/message';
import { DeliveryStatus } from '../../messaging/domain/message-delivery';
import { DamageStatus } from '../../inventory/domain/damage-report';
import { FollowUpStatus } from '../../follow-ups/domain/follow-up';
import type { DashboardStatsDto } from '../presentation/dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
    @InjectRepository(FellowshipEntity)
    private readonly fellowshipOrm: Repository<FellowshipEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentOrm: Repository<DepartmentEntity>,
    @InjectRepository(AttendanceSessionEntity)
    private readonly sessionOrm: Repository<AttendanceSessionEntity>,
    @InjectRepository(AttendanceRecordEntity)
    private readonly recordOrm: Repository<AttendanceRecordEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageOrm: Repository<MessageEntity>,
    @InjectRepository(MessageDeliveryEntity)
    private readonly deliveryOrm: Repository<MessageDeliveryEntity>,
    @InjectRepository(InventoryItemEntity)
    private readonly itemOrm: Repository<InventoryItemEntity>,
    @InjectRepository(DamageReportEntity)
    private readonly damageOrm: Repository<DamageReportEntity>,
    @InjectRepository(FollowUpEntity)
    private readonly followUpOrm: Repository<FollowUpEntity>,
    @InjectRepository(FollowUpAttemptEntity)
    private readonly followUpAttemptOrm: Repository<FollowUpAttemptEntity>,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [
      members,
      fellowships,
      departments,
      attendance,
      messaging,
      inventory,
      followUps,
      attention,
    ] = await Promise.all([
      this.getMemberStats(),
      this.getFellowshipStats(),
      this.getDepartmentStats(),
      this.getAttendanceStats(),
      this.getMessagingStats(),
      this.getInventoryStats(),
      this.getFollowUpStats(),
      this.getAttentionStats(),
    ]);

    return {
      members,
      fellowships,
      departments,
      attendance,
      messaging,
      inventory,
      followUps,
      attention,
    };
  }

  private async getMemberStats() {
    const [rows, firstTimeVisitors] = await Promise.all([
      this.memberOrm
        .createQueryBuilder('m')
        .select('m.activity_status', 'activityStatus')
        .addSelect('m.status', 'status')
        .addSelect('m.member_type', 'memberType')
        .addSelect('m.age_group', 'ageGroup')
        .addSelect('m.gender', 'gender')
        .addSelect('m.is_online', 'isOnline')
        .addSelect('m.is_international', 'isInternational')
        .addSelect('COUNT(*)', 'count')
        .groupBy(
          'm.activity_status, m.status, m.member_type, m.age_group, m.gender, m.is_online, m.is_international',
        )
        .getRawMany<{
          activityStatus: string;
          status: string;
          memberType: string;
          ageGroup?: string | null;
          gender?: string | null;
          isOnline?: boolean;
          isInternational?: boolean;
          count: string;
        }>(),
      this.memberOrm.count({
        where: { churchRole: ChurchRole.FIRST_TIME_VISITOR },
      }),
    ]);

    let total = 0,
      active = 0,
      inactive = 0;
    let guest = 0,
      member = 0,
      leader = 0;
    let adult = 0,
      child = 0;
    let online = 0,
      international = 0;
    const byAgeGroup: Record<string, number> = {};
    const byGender: Record<string, number> = {
      male: 0,
      female: 0,
      unspecified: 0,
    };

    for (const row of rows) {
      const n = Number(row.count);
      total += n;
      const ageKey = row.ageGroup || 'unknown';
      byAgeGroup[ageKey] = (byAgeGroup[ageKey] ?? 0) + n;
      const gender = (row.gender ?? '').toLowerCase();
      byGender[
        gender === 'male' || gender === 'female' ? gender : 'unspecified'
      ] += n;
      if (row.isOnline) online += n;
      if (row.isInternational) international += n;
      if ((row.activityStatus as ActivityStatus) === ActivityStatus.ACTIVE)
        active += n;
      else inactive += n;
      if ((row.status as MemberStatus) === MemberStatus.GUEST) guest += n;
      else if ((row.status as MemberStatus) === MemberStatus.MEMBER)
        member += n;
      else if ((row.status as MemberStatus) === MemberStatus.LEADER)
        leader += n;
      if ((row.memberType as MemberType) === MemberType.ADULT) adult += n;
      else child += n;
    }

    return {
      total,
      active,
      inactive,
      firstTimeVisitors,
      byStatus: { guest, member, leader },
      byType: { adult, child },
      byAgeGroup,
      byGender,
      online,
      international,
    };
  }

  private async getFellowshipStats() {
    const [rows, zoneRows] = await Promise.all([
      this.fellowshipOrm
        .createQueryBuilder('f')
        .select('f.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('f.status')
        .getRawMany<{ status: string; count: string }>(),
      this.getZoneSummaries(),
    ]);

    let total = 0,
      active = 0,
      inactive = 0;
    for (const row of rows) {
      const n = Number(row.count);
      total += n;
      if ((row.status as ActivityStatus) === ActivityStatus.ACTIVE) active += n;
      else inactive += n;
    }
    return { total, active, inactive, zones: zoneRows };
  }

  /** Per-zone rollup for the dashboard. Zones that have no fellowships yet are omitted. */
  private async getZoneSummaries() {
    const rows = await this.fellowshipOrm
      .createQueryBuilder('f')
      .innerJoin(FellowshipZoneEntity, 'z', 'z.id = f.zone_id')
      .leftJoin(MemberEntity, 'm', 'm.fellowship_id = f.id')
      .select('z.id', 'id')
      .addSelect('z.name', 'name')
      .addSelect('COUNT(DISTINCT f.id)', 'fellowshipCount')
      .addSelect(
        `COUNT(DISTINCT f.id) FILTER (WHERE f.status = '${ActivityStatus.ACTIVE}')`,
        'activeFellowships',
      )
      .addSelect('COUNT(DISTINCT m.id)', 'memberCount')
      .addSelect('ARRAY_AGG(DISTINCT f.meeting_day)', 'meetingDays')
      .groupBy('z.id, z.name')
      .orderBy('z.name', 'ASC')
      .getRawMany<{
        id: string;
        name: string;
        fellowshipCount: string;
        activeFellowships: string;
        memberCount: string;
        meetingDays: string[] | null;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      fellowshipCount: Number(r.fellowshipCount),
      activeFellowships: Number(r.activeFellowships),
      memberCount: Number(r.memberCount),
      meetingDays: r.meetingDays ?? [],
    }));
  }

  private async getDepartmentStats() {
    const total = await this.departmentOrm.count();
    return { total };
  }

  private async getAttendanceStats() {
    const totalSessions = await this.sessionOrm.count();

    const lastSession = await this.sessionOrm
      .createQueryBuilder('s')
      .orderBy('s.session_date', 'DESC')
      .getOne();

    if (!lastSession) {
      return { totalSessions, lastSession: null };
    }

    const recordRows = await this.recordOrm
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('r.session_id = :id', { id: lastSession.id })
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();

    const statusMap: Record<string, number> = {};
    let totalRecorded = 0;
    for (const row of recordRows) {
      statusMap[row.status] = Number(row.count);
      totalRecorded += Number(row.count);
    }

    const present = statusMap[AttendanceStatus.PRESENT] ?? 0;
    const absent = statusMap[AttendanceStatus.ABSENT] ?? 0;
    const excused = statusMap[AttendanceStatus.EXCUSED] ?? 0;
    const attendanceRate =
      totalRecorded > 0 ? Math.round((present / totalRecorded) * 1000) / 10 : 0;

    return {
      totalSessions,
      lastSession: {
        id: lastSession.id,
        title: lastSession.title,
        sessionDate: lastSession.sessionDate,
        totalRecorded,
        present,
        absent,
        excused,
        attendanceRate,
      },
    };
  }

  private async getMessagingStats() {
    const [msgRows, deliveryRows, recentRows] = await Promise.all([
      this.messageOrm
        .createQueryBuilder('m')
        .select('m.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('m.status')
        .getRawMany<{ status: string; count: string }>(),
      this.deliveryOrm
        .createQueryBuilder('d')
        .select('d.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('d.status')
        .getRawMany<{ status: string; count: string }>(),
      this.messageOrm
        .createQueryBuilder('m')
        .leftJoin(MessageDeliveryEntity, 'd', 'd.message_id = m.id')
        .select('m.id', 'id')
        .addSelect('m.title', 'title')
        .addSelect('m.type', 'type')
        .addSelect('m.target_group', 'targetGroup')
        .addSelect('m.sent_at', 'sentAt')
        .addSelect('COUNT(d.id)', 'total')
        .addSelect(
          `COUNT(d.id) FILTER (WHERE d.status = '${DeliveryStatus.DELIVERED}')`,
          'delivered',
        )
        .where('m.status = :sent', { sent: MessageStatus.SENT })
        .groupBy('m.id')
        .orderBy('m.sent_at', 'DESC')
        .limit(4)
        .getRawMany<{
          id: string;
          title: string;
          type: string;
          targetGroup: string;
          sentAt: Date | null;
          total: string;
          delivered: string;
        }>(),
    ]);

    let totalMessages = 0,
      sent = 0,
      drafts = 0;
    for (const row of msgRows) {
      const n = Number(row.count);
      totalMessages += n;
      if ((row.status as MessageStatus) === MessageStatus.SENT) sent += n;
      else drafts += n;
    }

    let totalDeliveries = 0,
      delivered = 0,
      sentDeliveries = 0,
      pendingDeliveries = 0,
      failedDeliveries = 0;
    for (const row of deliveryRows) {
      const n = Number(row.count);
      totalDeliveries += n;
      switch (row.status as DeliveryStatus) {
        case DeliveryStatus.DELIVERED:
          delivered += n;
          break;
        case DeliveryStatus.SENT:
          sentDeliveries += n;
          break;
        case DeliveryStatus.PENDING:
          pendingDeliveries += n;
          break;
        case DeliveryStatus.FAILED:
          failedDeliveries += n;
          break;
      }
    }

    const recent = recentRows.map((r) => {
      const total = Number(r.total);
      const deliveredCount = Number(r.delivered);
      return {
        id: r.id,
        title: r.title,
        type: r.type,
        targetGroup: r.targetGroup,
        sentAt: r.sentAt,
        deliveryRate:
          total > 0 ? Math.round((deliveredCount / total) * 100) : 0,
      };
    });

    return {
      totalMessages,
      sent,
      drafts,
      totalDeliveries,
      delivered,
      sentDeliveries,
      pendingDeliveries,
      failedDeliveries,
      recent,
    };
  }

  private async getInventoryStats() {
    const [totalItems, lowStockItems, pendingDamageReports] = await Promise.all(
      [
        this.itemOrm.count(),
        this.itemOrm
          .createQueryBuilder('i')
          .where('i.available_qty < i.total_qty * 0.2')
          .getCount(),
        this.damageOrm.count({ where: { status: DamageStatus.PENDING } }),
      ],
    );
    return { totalItems, lowStockItems, pendingDamageReports };
  }

  /**
   * Short lists (at most 5 each) of the specific records behind the dashboard alerts.
   * Overall totals for stock and damage reports are already in `inventory`.
   */
  private async getAttentionStats() {
    const limit = 5;
    const [
      lowStock,
      pendingDamage,
      fellowshipsWithoutLeader,
      departmentsBelowTarget,
    ] = await Promise.all([
      this.itemOrm
        .createQueryBuilder('i')
        .select('i.id', 'id')
        .addSelect('i.name', 'name')
        .addSelect('i.available_qty', 'availableQty')
        .addSelect('i.total_qty', 'totalQty')
        .where('i.available_qty < i.total_qty * 0.2')
        .orderBy('i.available_qty', 'ASC')
        .limit(limit)
        .getRawMany<{
          id: string;
          name: string;
          availableQty: number;
          totalQty: number;
        }>(),
      this.damageOrm
        .createQueryBuilder('d')
        .innerJoin(InventoryItemEntity, 'i', 'i.id = d.item_id')
        .select('d.id', 'id')
        .addSelect('i.name', 'itemName')
        .addSelect('d.severity', 'severity')
        .addSelect('d.quantity_affected', 'quantityAffected')
        .where('d.status = :status', { status: DamageStatus.PENDING })
        .orderBy('d.report_date', 'DESC')
        .limit(limit)
        .getRawMany<{
          id: string;
          itemName: string;
          severity: string;
          quantityAffected: number;
        }>(),
      this.fellowshipOrm
        .createQueryBuilder('f')
        .innerJoin(FellowshipZoneEntity, 'z', 'z.id = f.zone_id')
        .select('f.id', 'id')
        .addSelect('f.name', 'name')
        .addSelect('z.name', 'zoneName')
        .where('f.leader_id IS NULL')
        .orderBy('f.name', 'ASC')
        .limit(limit)
        .getRawMany<{ id: string; name: string; zoneName: string }>(),
      this.departmentOrm
        .createQueryBuilder('d')
        .leftJoin('member_departments', 'md', 'md.department_id = d.id')
        .select('d.id', 'id')
        .addSelect('d.name', 'name')
        .addSelect('d.member_target', 'target')
        .addSelect('COUNT(md.member_id)', 'memberCount')
        .where('d.member_target > 0')
        .groupBy('d.id')
        .having('COUNT(md.member_id) < d.member_target')
        // Largest shortfall first, so the capped list shows the departments that need the most people.
        .orderBy('(d.member_target - COUNT(md.member_id))', 'DESC')
        .addOrderBy('d.name', 'ASC')
        .limit(limit)
        .getRawMany<{
          id: string;
          name: string;
          target: number;
          memberCount: string;
        }>(),
    ]);

    return {
      lowStock,
      pendingDamage,
      fellowshipsWithoutLeader,
      departmentsBelowTarget: departmentsBelowTarget.map((d) => ({
        id: d.id,
        name: d.name,
        target: Number(d.target),
        memberCount: Number(d.memberCount),
      })),
    };
  }

  private async getFollowUpStats() {
    const today = new Date().toISOString().slice(0, 10);

    const [open, overdue, completed, unassigned, total, recentAttempts] =
      await Promise.all([
        this.followUpOrm.count({ where: { status: FollowUpStatus.OPEN } }),
        this.followUpOrm
          .createQueryBuilder('f')
          .where('f.status = :status', { status: FollowUpStatus.OPEN })
          .andWhere('f.due_date < :today', { today })
          .getCount(),
        this.followUpOrm.count({
          where: { status: FollowUpStatus.COMPLETED },
        }),
        this.followUpOrm
          .createQueryBuilder('f')
          .where('f.status = :status', { status: FollowUpStatus.OPEN })
          .andWhere('f.owner_id IS NULL')
          .getCount(),
        this.followUpOrm.count(),
        this.getRecentFollowUpAttempts(),
      ]);

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      open,
      overdue,
      completed,
      unassigned,
      completionRate,
      recentAttempts,
    };
  }

  private async getRecentFollowUpAttempts() {
    return this.followUpAttemptOrm
      .createQueryBuilder('a')
      .innerJoin(FollowUpEntity, 'f', 'f.id = a.task_id')
      .innerJoin(MemberEntity, 'm', 'm.id = f.member_id')
      .select('a.id', 'id')
      .addSelect('a.task_id', 'taskId')
      .addSelect('f.title', 'taskTitle')
      .addSelect("m.first_name || ' ' || m.last_name", 'memberName')
      .addSelect('a.contact_method', 'contactMethod')
      .addSelect('a.outcome', 'outcome')
      .addSelect('a.contacted_at', 'contactedAt')
      .orderBy('a.contacted_at', 'DESC')
      .limit(5)
      .getRawMany<{
        id: string;
        taskId: string;
        taskTitle: string;
        memberName: string;
        contactMethod: string;
        outcome: string;
        contactedAt: Date;
      }>();
  }
}
