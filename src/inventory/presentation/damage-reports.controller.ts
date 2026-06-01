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
import { InventoryService } from '../application/inventory.service';
import { CreateDamageReportDto } from './dto/create-damage-report.dto';
import { UpdateDamageReportDto } from './dto/update-damage-report.dto';
import { DamageReportResponseDto } from './dto/damage-report-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('inventory/damage-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DamageReportsController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async findAll() {
    const reports = await this.service.findAllDamageReports();
    return reports.map((r) => new DamageReportResponseDto(r));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new DamageReportResponseDto(
      await this.service.findDamageReportById(id),
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(
    @Body() dto: CreateDamageReportDto,
    @CurrentUser('sub') userId: string,
  ) {
    return new DamageReportResponseDto(
      await this.service.createDamageReport(dto, userId),
    );
  }

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

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteDamageReport(id);
  }
}
