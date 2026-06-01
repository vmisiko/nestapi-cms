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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // --- Sessions ---

  @ApiOperation({ summary: 'List all attendance sessions' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  @Get('sessions')
  async findAllSessions() {
    const sessions = await this.service.findAllSessions();
    return sessions.map((s) => new SessionResponseDto(s));
  }

  @ApiOperation({ summary: 'Get an attendance session by ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @Get('sessions/:id')
  async findSession(@Param('id', ParseUUIDPipe) id: string) {
    return new SessionResponseDto(await this.service.findSessionById(id));
  }

  @ApiOperation({ summary: 'Create a new attendance session (admin+)' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  @Post('sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async createSession(@Body() dto: CreateSessionDto) {
    return new SessionResponseDto(await this.service.createSession(dto));
  }

  @ApiOperation({ summary: 'Update an attendance session (admin+)' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @Patch('sessions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return new SessionResponseDto(await this.service.updateSession(id, dto));
  }

  @ApiOperation({ summary: 'Delete an attendance session (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  @Delete('sessions/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSession(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteSession(id);
  }

  @ApiOperation({ summary: 'Get all attendance records for a session' })
  @ApiResponse({ status: 200, type: [AttendanceRecordResponseDto] })
  @Get('sessions/:id/records')
  async getSessionAttendance(@Param('id', ParseUUIDPipe) id: string) {
    const records = await this.service.getSessionAttendance(id);
    return records.map((r) => new AttendanceRecordResponseDto(r));
  }

  // --- Records ---

  @ApiOperation({ summary: 'Record attendance for a member (admin+)' })
  @ApiResponse({ status: 201, type: AttendanceRecordResponseDto })
  @Post('records')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async recordAttendance(@Body() dto: RecordAttendanceDto) {
    return new AttendanceRecordResponseDto(
      await this.service.recordAttendance(dto),
    );
  }

  @ApiOperation({ summary: 'Get all attendance records for a member' })
  @ApiResponse({ status: 200, type: [AttendanceRecordResponseDto] })
  @Get('members/:memberId/records')
  async getMemberAttendance(
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const records = await this.service.getMemberAttendance(memberId);
    return records.map((r) => new AttendanceRecordResponseDto(r));
  }

  @ApiOperation({ summary: 'Update an attendance record (admin+)' })
  @ApiResponse({ status: 200, type: AttendanceRecordResponseDto })
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

  @ApiOperation({ summary: 'Delete an attendance record (admin+)' })
  @ApiResponse({ status: 204, description: 'Attendance record deleted' })
  @Delete('records/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRecord(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteRecord(id);
  }
}
