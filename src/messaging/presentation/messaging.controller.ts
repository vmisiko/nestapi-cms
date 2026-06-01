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
import { MessagingService } from '../application/messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import {
  DeliveryResponseDto,
  DeliveryStatsResponseDto,
} from './dto/delivery-response.dto';
import { UwaziiDlrDto } from './dto/uwazii-dlr.dto';
import { SendResultDto } from './dto/send-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  // ─── Message CRUD ────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll() {
    const messages = await this.service.findAll();
    return messages.map((m) => new MessageResponseDto(m));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new MessageResponseDto(await this.service.findById(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(
    @Body() dto: CreateMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return new MessageResponseDto(await this.service.create(dto, userId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return new MessageResponseDto(await this.service.update(id, dto));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  // ─── Send & Delivery Tracking ─────────────────────────────────────────────

  /**
   * Dispatch a message to its target group via Uwazii SMS.
   * Returns a summary of how many were sent, failed, or skipped.
   */
  @Post(':id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async send(@Param('id', ParseUUIDPipe) id: string) {
    return new SendResultDto(await this.service.send(id));
  }

  /**
   * List every individual SMS delivery record for a message.
   * Each row represents one member recipient and tracks their delivery status.
   */
  @Get(':id/deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getDeliveries(@Param('id', ParseUUIDPipe) id: string) {
    const deliveries = await this.service.getDeliveries(id);
    return deliveries.map((d) => new DeliveryResponseDto(d));
  }

  /**
   * Aggregated delivery stats for a message:
   * { total, pending, sent, delivered, failed }
   */
  @Get(':id/deliveries/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getDeliveryStats(@Param('id', ParseUUIDPipe) id: string) {
    return new DeliveryStatsResponseDto(
      await this.service.getDeliveryStats(id),
    );
  }

  // ─── Uwazii DLR Callback ─────────────────────────────────────────────────

  /**
   * Public endpoint — no auth. Uwazii posts delivery status updates here.
   * Set UWAZII_CALLBACK_URL=https://yourdomain.com/messaging/dlr
   */
  @Post('dlr')
  @HttpCode(HttpStatus.OK)
  async handleDlr(@Body() dto: UwaziiDlrDto) {
    const isDelivered = dto.status === 'delivered';
    await this.service.handleDlr(
      dto.id,
      isDelivered ? 'delivered' : 'failed',
      dto.delivered_at ? new Date(dto.delivered_at) : undefined,
    );
    return { received: true };
  }
}
