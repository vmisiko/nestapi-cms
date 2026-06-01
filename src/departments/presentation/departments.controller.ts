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
import { DepartmentsService } from '../application/departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, type: [DepartmentResponseDto] })
  @Get()
  async findAll() {
    const depts = await this.service.findAll();
    return depts.map((d) => new DepartmentResponseDto(d));
  }

  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new DepartmentResponseDto(await this.service.findById(id));
  }

  @ApiOperation({ summary: 'Create a new department (admin+)' })
  @ApiResponse({ status: 201, type: DepartmentResponseDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateDepartmentDto) {
    return new DepartmentResponseDto(await this.service.create(dto));
  }

  @ApiOperation({ summary: 'Update a department (admin+)' })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return new DepartmentResponseDto(await this.service.update(id, dto));
  }

  @ApiOperation({ summary: 'Delete a department (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Department deleted' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
