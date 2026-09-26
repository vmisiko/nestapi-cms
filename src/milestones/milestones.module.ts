import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestoneTypeEntity } from './infrastructure/milestone-type.entity';
import { MemberMilestoneEntity } from './infrastructure/member-milestone.entity';
import { MilestoneTypeRepository } from './infrastructure/milestone-type.repository';
import { MemberMilestoneRepository } from './infrastructure/member-milestone.repository';
import { MilestonesService } from './application/milestones.service';
import { MilestoneTypesController } from './presentation/milestone-types.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MilestoneTypeEntity, MemberMilestoneEntity]),
  ],
  controllers: [MilestoneTypesController],
  providers: [MilestoneTypeRepository, MemberMilestoneRepository, MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
