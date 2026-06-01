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
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FellowshipsService } from '../application/fellowships.service';
import { CreateFellowshipDto } from './dto/create-fellowship.dto';
import { UpdateFellowshipDto } from './dto/update-fellowship.dto';
import { FellowshipFiltersDto } from './dto/fellowship-filters.dto';
import { FellowshipResponseDto } from './dto/fellowship-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Fellowships')
@ApiBearerAuth()
@Controller('fellowships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FellowshipsController {
  constructor(private readonly service: FellowshipsService) {}

  @ApiOperation({ summary: 'List all fellowships (with optional filters)' })
  @ApiResponse({ status: 200, type: [FellowshipResponseDto] })
  @Get()
  async findAll(@Query() query: FellowshipFiltersDto) {
    const fellowships = await this.service.findAll(query);
    return fellowships.map((f) => new FellowshipResponseDto(f));
  }

  @ApiOperation({ summary: 'Get a fellowship by slug' })
  @ApiResponse({ status: 200, type: FellowshipResponseDto })
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return new FellowshipResponseDto(await this.service.findBySlug(slug));
  }

  @ApiOperation({ summary: 'Get a fellowship by ID' })
  @ApiResponse({ status: 200, type: FellowshipResponseDto })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new FellowshipResponseDto(await this.service.findById(id));
  }

  @ApiOperation({ summary: 'Create a new fellowship (admin+)' })
  @ApiResponse({ status: 201, type: FellowshipResponseDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateFellowshipDto) {
    return new FellowshipResponseDto(await this.service.create(dto));
  }

  @ApiOperation({ summary: 'Update a fellowship (admin+)' })
  @ApiResponse({ status: 200, type: FellowshipResponseDto })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFellowshipDto,
  ) {
    return new FellowshipResponseDto(await this.service.update(id, dto));
  }

  @ApiOperation({ summary: 'Delete a fellowship (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Fellowship deleted' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
