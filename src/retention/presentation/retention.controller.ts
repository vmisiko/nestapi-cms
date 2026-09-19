import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RetentionService } from '../application/retention.service';
import {
  RetentionQueryDto,
  AtRiskMembersQueryDto,
} from './dto/retention-query.dto';

@ApiTags('Retention')
@ApiBearerAuth()
@Controller('retention')
@UseGuards(JwtAuthGuard)
export class RetentionController {
  constructor(private readonly service: RetentionService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Retention, guest conversion, and follow-up completion metrics',
  })
  getStats(@Query() query: RetentionQueryDto) {
    return this.service.getStats(query);
  }

  @Get('at-risk-members')
  @ApiOperation({
    summary: 'Paginated list of inactive or stale-guest members',
  })
  getAtRiskMembers(@Query() query: AtRiskMembersQueryDto) {
    return this.service.getAtRiskMembers(query.page, query.limit);
  }
}
