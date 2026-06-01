import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { FellowshipEntity } from '../fellowships/infrastructure/fellowship.entity';
import { DepartmentEntity } from '../departments/infrastructure/department.entity';
import { AttendanceSessionEntity } from '../attendance/infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from '../attendance/infrastructure/attendance-record.entity';
import { MessageEntity } from '../messaging/infrastructure/message.entity';
import { MessageDeliveryEntity } from '../messaging/infrastructure/message-delivery.entity';
import { InventoryItemEntity } from '../inventory/infrastructure/inventory-item.entity';
import { DamageReportEntity } from '../inventory/infrastructure/damage-report.entity';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberEntity,
      FellowshipEntity,
      DepartmentEntity,
      AttendanceSessionEntity,
      AttendanceRecordEntity,
      MessageEntity,
      MessageDeliveryEntity,
      InventoryItemEntity,
      DamageReportEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
