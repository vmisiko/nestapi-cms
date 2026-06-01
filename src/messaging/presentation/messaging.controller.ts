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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Get()
  async findAll() {
    const messages = await this.service.findAll();
    return messages.map((m) => new MessageResponseDto(m));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new MessageResponseDto(await this.service.findById(id));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(
    @Body() dto: CreateMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return new MessageResponseDto(await this.service.create(dto, userId));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return new MessageResponseDto(await this.service.update(id, dto));
  }

  @Post(':id/send')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async send(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.send(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }
}
