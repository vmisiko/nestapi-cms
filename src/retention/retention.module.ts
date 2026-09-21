import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { AttendanceRecordEntity } from '../attendance/infrastructure/attendance-record.entity';
import { AttendanceSessionEntity } from '../attendance/infrastructure/attendance-session.entity';
import { FollowUpEntity } from '../follow-ups/infrastructure/follow-up.entity';
import { DepartmentEntity } from '../departments/infrastructure/department.entity';
import { FellowshipEntity } from '../fellowships/infrastructure/fellowship.entity';
import { RetentionService } from './application/retention.service';
import { RetentionController } from './presentation/retention.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberEntity,
      AttendanceRecordEntity,
      AttendanceSessionEntity,
      FollowUpEntity,
      DepartmentEntity,
      FellowshipEntity,
    ]),
  ],
  controllers: [RetentionController],
  providers: [RetentionService],
})
export class RetentionModule {}
