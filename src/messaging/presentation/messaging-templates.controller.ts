import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MessagingTemplatesService } from '../application/messaging-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Messaging')
@Controller('messaging/templates')
export class MessagingTemplatesController {
  constructor(private readonly service: MessagingTemplatesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all message templates' })
  @ApiResponse({ status: 200, type: [TemplateResponseDto] })
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    const templates = await this.service.findAll();
    return templates.map((t) => new TemplateResponseDto(t));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new message template (admin+)' })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    return new TemplateResponseDto(await this.service.create(dto, userId));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a message template (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
