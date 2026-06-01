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
import { FellowshipZonesService } from '../application/fellowship-zones.service';
import { CreateFellowshipZoneDto } from './dto/create-fellowship-zone.dto';
import { UpdateFellowshipZoneDto } from './dto/update-fellowship-zone.dto';
import { FellowshipZoneResponseDto } from './dto/fellowship-zone-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('fellowship-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FellowshipZonesController {
  constructor(private readonly service: FellowshipZonesService) {}

  @Get()
  async findAll() {
    const zones = await this.service.findAll();
    return zones.map((z) => new FellowshipZoneResponseDto(z));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new FellowshipZoneResponseDto(await this.service.findById(id));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateFellowshipZoneDto) {
    return new FellowshipZoneResponseDto(await this.service.create(dto));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFellowshipZoneDto,
  ) {
    return new FellowshipZoneResponseDto(await this.service.update(id, dto));
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
