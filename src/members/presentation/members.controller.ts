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
import { MembersService } from '../application/members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberFiltersDto } from './dto/member-filters.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Get()
  async findAll(@Query() query: MemberFiltersDto) {
    const { data, total } = await this.service.findAll(query);
    return { data: data.map((m) => new MemberResponseDto(m)), total };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new MemberResponseDto(await this.service.findById(id));
  }

  @Get(':id/departments')
  async findDepartments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findDepartments(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateMemberDto) {
    return new MemberResponseDto(await this.service.create(dto));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return new MemberResponseDto(await this.service.update(id, dto));
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  @Post(':id/departments/:departmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async assignDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.service.assignDepartment(id, departmentId);
  }

  @Delete(':id/departments/:departmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    await this.service.removeDepartment(id, departmentId);
  }
}
