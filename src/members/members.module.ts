import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MemberEntity } from './infrastructure/member.entity';
import { MemberStatusHistoryEntity } from './infrastructure/member-status-history.entity';
import { FellowshipEntity } from '../fellowships/infrastructure/fellowship.entity';
import { MemberRepository } from './infrastructure/member.repository';
import { MembersService } from './application/members.service';
import { MembersController } from './presentation/members.controller';
import { AutomationModule } from '../automation/automation.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberEntity,
      MemberStatusHistoryEntity,
      FellowshipEntity,
    ]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    AutomationModule,
    MilestonesModule,
  ],
  controllers: [MembersController],
  providers: [MemberRepository, MembersService],
  exports: [MembersService, MemberRepository],
})
export class MembersModule {}
