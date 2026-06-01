import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from '../application/attendance.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { AttendanceRecordResponseDto } from './dto/attendance-record-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // --- Sessions ---

  @Get('sessions')
  async findAllSessions() {
    const sessions = await this.service.findAllSessions();
    return sessions.map((s) => new SessionResponseDto(s));
  }

  @Get('sessions/:id')
  async findSession(@Param('id', ParseUUIDPipe) id: string) {
    return new SessionResponseDto(await this.service.findSessionById(id));
  }

  @Post('sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async createSession(@Body() dto: CreateSessionDto) {
    return new SessionResponseDto(await this.service.createSession(dto));
  }

  @Patch('sessions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return new SessionResponseDto(await this.service.updateSession(id, dto));
  }

  @Delete('sessions/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSession(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteSession(id);
  }

  @Get('sessions/:id/records')
  async getSessionAttendance(@Param('id', ParseUUIDPipe) id: string) {
    const records = await this.service.getSessionAttendance(id);
    return records.map((r) => new AttendanceRecordResponseDto(r));
  }

  // --- Records ---

  @Post('records')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async recordAttendance(@Body() dto: RecordAttendanceDto) {
    return new AttendanceRecordResponseDto(
      await this.service.recordAttendance(dto),
    );
  }

  @Get('members/:memberId/records')
  async getMemberAttendance(
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const records = await this.service.getMemberAttendance(memberId);
    return records.map((r) => new AttendanceRecordResponseDto(r));
  }

  @Patch('records/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceRecordDto,
  ) {
    return new AttendanceRecordResponseDto(
      await this.service.updateRecord(id, dto),
    );
  }

  @Delete('records/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRecord(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteRecord(id);
  }
}
