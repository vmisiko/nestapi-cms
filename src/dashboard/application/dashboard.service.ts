import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import { DepartmentEntity } from '../../departments/infrastructure/department.entity';
import { AttendanceSessionEntity } from '../../attendance/infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from '../../attendance/infrastructure/attendance-record.entity';
import { MessageEntity } from '../../messaging/infrastructure/message.entity';
import { MessageDeliveryEntity } from '../../messaging/infrastructure/message-delivery.entity';
import { InventoryItemEntity } from '../../inventory/infrastructure/inventory-item.entity';
import { DamageReportEntity } from '../../inventory/infrastructure/damage-report.entity';
import {
  ActivityStatus,
  MemberStatus,
  MemberType,
} from '../../members/domain/member';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { MessageStatus } from '../../messaging/domain/message';
import { DeliveryStatus } from '../../messaging/domain/message-delivery';
import { DamageReportStatus } from '../../inventory/domain/damage-report';
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
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [
      members,
      fellowships,
      departments,
      attendance,
      messaging,
      inventory,
    ] = await Promise.all([
      this.getMemberStats(),
      this.getFellowshipStats(),
      this.getDepartmentStats(),
      this.getAttendanceStats(),
      this.getMessagingStats(),
      this.getInventoryStats(),
    ]);

    return {
      members,
      fellowships,
      departments,
      attendance,
      messaging,
      inventory,
    };
  }

  private async getMemberStats() {
    const rows = await this.memberOrm
      .createQueryBuilder('m')
      .select('m.activity_status', 'activityStatus')
      .addSelect('m.status', 'status')
      .addSelect('m.member_type', 'memberType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.activity_status, m.status, m.member_type')
      .getRawMany<{
        activityStatus: string;
        status: string;
        memberType: string;
        count: string;
      }>();

    let total = 0,
      active = 0,
      inactive = 0;
    let guest = 0,
      member = 0,
      leader = 0;
    let adult = 0,
      child = 0;

    for (const row of rows) {
      const n = Number(row.count);
      total += n;
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
      byStatus: { guest, member, leader },
      byType: { adult, child },
    };
  }

  private async getFellowshipStats() {
    const rows = await this.fellowshipOrm
      .createQueryBuilder('f')
      .select('f.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('f.status')
      .getRawMany<{ status: string; count: string }>();

    let total = 0,
      active = 0,
      inactive = 0;
    for (const row of rows) {
      const n = Number(row.count);
      total += n;
      if ((row.status as ActivityStatus) === ActivityStatus.ACTIVE) active += n;
      else inactive += n;
    }
    return { total, active, inactive };
  }

  private async getDepartmentStats() {
    const total = await this.departmentOrm.count();
    return { total };
  }

  private async getAttendanceStats() {
    const totalSessions = await this.sessionOrm.count();

    const lastSession = await this.sessionOrm.findOne({
      order: { sessionDate: 'DESC' },
    });

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
    const [msgRows, deliveryRows] = await Promise.all([
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
      delivered = 0;
    for (const row of deliveryRows) {
      const n = Number(row.count);
      totalDeliveries += n;
      if ((row.status as DeliveryStatus) === DeliveryStatus.DELIVERED)
        delivered += n;
    }

    return { totalMessages, sent, drafts, totalDeliveries, delivered };
  }

  private async getInventoryStats() {
    const [totalItems, lowStockItems, pendingDamageReports] = await Promise.all(
      [
        this.itemOrm.count(),
        this.itemOrm
          .createQueryBuilder('i')
          .where('i.quantity <= i.min_stock_level')
          .getCount(),
        this.damageOrm.count({ where: { status: DamageReportStatus.PENDING } }),
      ],
    );
    return { totalItems, lowStockItems, pendingDamageReports };
  }
}
