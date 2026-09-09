import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FollowUpService } from '../application/follow-up.service';
import { FollowUpStatus } from '../domain/follow-up';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { RecordFollowUpAttemptDto } from './dto/record-follow-up-attempt.dto';

@ApiTags('Follow-ups')
@ApiBearerAuth()
@Controller('follow-ups')
@UseGuards(JwtAuthGuard)
export class FollowUpController {
  constructor(private readonly service: FollowUpService) {}

  @Get()
  @ApiOperation({ summary: 'List follow-up tasks, optionally by status' })
  findAll(@Query('status') status?: FollowUpStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a follow-up task and its contact attempts' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a follow-up task' })
  create(@Body() dto: CreateFollowUpDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a follow-up task or its status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/attempts')
  @ApiOperation({ summary: 'Record a contact attempt for a follow-up task' })
  recordAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordFollowUpAttemptDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.service.recordAttempt(id, dto, userId);
  }
}
