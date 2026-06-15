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
import { InventoryService } from '../application/inventory.service';
import { CreateDamageReportDto } from './dto/create-damage-report.dto';
import { UpdateDamageReportDto } from './dto/update-damage-report.dto';
import { DamageReportResponseDto } from './dto/damage-report-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Inventory — Damage Reports')
@ApiBearerAuth()
@Controller('inventory/damage-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DamageReportsController {
  constructor(private readonly service: InventoryService) {}

  @ApiOperation({ summary: 'List all damage reports' })
  @ApiResponse({ status: 200, type: [DamageReportResponseDto] })
  @Get()
  async findAll() {
    const reports = await this.service.findAllDamageReports();
    return reports.map((r) => new DamageReportResponseDto(r));
  }

  @ApiOperation({ summary: 'Get a damage report by ID' })
  @ApiResponse({ status: 200, type: DamageReportResponseDto })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new DamageReportResponseDto(
      await this.service.findDamageReportById(id),
    );
  }

  @ApiOperation({ summary: 'Create a new damage report (admin+)' })
  @ApiResponse({ status: 201, type: DamageReportResponseDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateDamageReportDto) {
    return new DamageReportResponseDto(
      await this.service.createDamageReport(dto),
    );
  }

  @ApiOperation({ summary: 'Update a damage report (admin+)' })
  @ApiResponse({ status: 200, type: DamageReportResponseDto })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDamageReportDto,
  ) {
    return new DamageReportResponseDto(
      await this.service.updateDamageReport(id, dto),
    );
  }

  @ApiOperation({ summary: 'Delete a damage report (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Damage report deleted' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteDamageReport(id);
  }
}
