import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { VisitorsService } from './application/visitors.service';
import { VisitorReportsService } from './application/visitor-reports.service';
import { VisitorSearchService } from './application/visitor-search.service';
import { VisitorsController } from './presentation/visitors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MemberEntity])],
  controllers: [VisitorsController],
  providers: [VisitorsService, VisitorReportsService, VisitorSearchService],
})
export class VisitorsModule {}
