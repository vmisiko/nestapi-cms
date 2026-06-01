import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceSessionEntity } from './infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from './infrastructure/attendance-record.entity';
import { AttendanceSessionRepository } from './infrastructure/attendance-session.repository';
import { AttendanceRecordRepository } from './infrastructure/attendance-record.repository';
import { AttendanceService } from './application/attendance.service';
import { AttendanceController } from './presentation/attendance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceSessionEntity, AttendanceRecordEntity]),
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceSessionRepository,
    AttendanceRecordRepository,
    AttendanceService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
