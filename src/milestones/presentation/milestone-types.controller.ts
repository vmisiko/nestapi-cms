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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MilestonesService } from '../application/milestones.service';
import { CreateMilestoneTypeDto } from './dto/create-milestone-type.dto';
import { UpdateMilestoneTypeDto } from './dto/update-milestone-type.dto';
import { MilestoneTypeResponseDto } from './dto/milestone-type-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Milestone Types')
@ApiBearerAuth()
@Controller('milestone-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestoneTypesController {
  constructor(private readonly service: MilestonesService) {}

  @ApiOperation({ summary: 'List all spiritual milestone types' })
  @ApiResponse({ status: 200, type: [MilestoneTypeResponseDto] })
  @Get()
  async findAll() {
    const types = await this.service.findAllTypes();
    return types.map((t) => new MilestoneTypeResponseDto(t));
  }

  @ApiOperation({ summary: 'Create a milestone type (admin+)' })
  @ApiResponse({ status: 201, type: MilestoneTypeResponseDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateMilestoneTypeDto) {
    return new MilestoneTypeResponseDto(await this.service.createType(dto));
  }

  @ApiOperation({ summary: 'Update a milestone type (admin+)' })
  @ApiResponse({ status: 200, type: MilestoneTypeResponseDto })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneTypeDto,
  ) {
    return new MilestoneTypeResponseDto(
      await this.service.updateType(id, dto),
    );
  }

  @ApiOperation({
    summary:
      'Delete a milestone type (super_admin only) -- refused if members have this milestone recorded',
  })
  @ApiResponse({ status: 204, description: 'Milestone type deleted' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteType(id);
  }
}
