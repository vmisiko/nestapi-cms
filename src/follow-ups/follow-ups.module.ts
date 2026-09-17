import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowUpEntity } from './infrastructure/follow-up.entity';
import { FollowUpAttemptEntity } from './infrastructure/follow-up-attempt.entity';
import { FollowUpRepository } from './infrastructure/follow-up.repository';
import { FollowUpService } from './application/follow-up.service';
import { FollowUpController } from './presentation/follow-up.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FollowUpEntity, FollowUpAttemptEntity])],
  controllers: [FollowUpController],
  providers: [FollowUpRepository, FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpsModule {}
