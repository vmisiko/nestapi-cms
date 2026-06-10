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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MembersService } from '../application/members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberFiltersDto } from './dto/member-filters.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { BulkImportMembersDto } from './dto/bulk-import-members.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Get()
  @ApiOperation({
    summary: 'List members with optional filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: '{ data: MemberResponseDto[], total: number }',
  })
  async findAll(@Query() query: MemberFiltersDto) {
    const { data, total } = await this.service.findAll(query);
    return { data: data.map((m) => new MemberResponseDto(m)), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a member by ID' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new MemberResponseDto(await this.service.findById(id));
  }

  @Get(':id/departments')
  @ApiOperation({ summary: "List a member's assigned departments" })
  async findDepartments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findDepartments(id);
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Bulk import members from CSV data' })
  @ApiResponse({
    status: 201,
    description: '{ imported, duplicates, errors, members }',
  })
  async bulkImport(@Body() dto: BulkImportMembersDto) {
    return this.service.bulkImport(dto);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new member' })
  @ApiResponse({ status: 201, type: MemberResponseDto })
  async create(@Body() dto: CreateMemberDto) {
    return new MemberResponseDto(await this.service.create(dto));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a member' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return new MemberResponseDto(await this.service.update(id, dto));
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a member' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  @Post(':id/departments/:departmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a member to a department' })
  @ApiResponse({ status: 201 })
  async assignDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.service.assignDepartment(id, departmentId);
  }

  @Delete(':id/departments/:departmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a department' })
  @ApiResponse({ status: 204 })
  async removeDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    await this.service.removeDepartment(id, departmentId);
  }
}
