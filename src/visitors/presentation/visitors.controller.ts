import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';
import { VisitorsService } from '../application/visitors.service';
import { VisitorReportsService } from '../application/visitor-reports.service';
import { VisitorSearchService } from '../application/visitor-search.service';
import { VisitorOverviewQueryDto } from './dto/visitor-overview-query.dto';
import {
  VisitorReportQueryDto,
  VisitorSearchQueryDto,
} from './dto/visitor-report-query.dto';

@ApiTags('Visitors')
@ApiBearerAuth()
@Controller('visitors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitorsController {
  constructor(
    private readonly service: VisitorsService,
    private readonly reports: VisitorReportsService,
    private readonly search: VisitorSearchService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary:
      'Search first-time visitors by name, phone or visitor ID, and/or the day they registered',
  })
  searchVisitors(@Query() query: VisitorSearchQueryDto) {
    return this.search.search(query.q, query.mode, query.registeredOn);
  }

  @Get('overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary:
      'First-time visitor overview: counts, follow-ups due/overdue and weekly retention for a date range',
  })
  getOverview(@Query() query: VisitorOverviewQueryDto) {
    return this.service.getOverview(query.from, query.to);
  }

  @Get('retention-report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary:
      'Per-visitor weekly return report for first-time visitors in a date range',
  })
  getRetentionReport(@Query() query: VisitorReportQueryDto) {
    return this.service.getRetentionReport(query.from, query.to, query);
  }

  @Get('reports/:type')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary:
      'A visitor report (first-time-visitors, attendance, cohort, follow-up, journey, activity, inactive) with shared filters',
  })
  getReport(
    @Param('type') type: string,
    @Query() query: VisitorReportQueryDto,
  ) {
    return this.reports.getReport(type, query.from, query.to, query);
  }
}
