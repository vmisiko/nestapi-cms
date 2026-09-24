import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';
import { RetentionService } from '../application/retention.service';
import {
  RetentionQueryDto,
  AtRiskMembersQueryDto,
} from './dto/retention-query.dto';

@ApiTags('Retention')
@ApiBearerAuth()
@Controller('retention')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetentionController {
  constructor(private readonly service: RetentionService) {}

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Retention, guest conversion, and follow-up completion metrics',
  })
  getStats(@Query() query: RetentionQueryDto) {
    return this.service.getStats(query);
  }

  @Get('at-risk-members')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Paginated list of inactive or stale-guest members',
  })
  getAtRiskMembers(@Query() query: AtRiskMembersQueryDto) {
    return this.service.getAtRiskMembers(query.page, query.limit);
  }
}
