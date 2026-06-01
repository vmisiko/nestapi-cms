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
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('inventory/items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryItemsController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async findAll() {
    const items = await this.service.findAllItems();
    return items.map((i) => new ItemResponseDto(i));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new ItemResponseDto(await this.service.findItemById(id));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateItemDto) {
    return new ItemResponseDto(await this.service.createItem(dto));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return new ItemResponseDto(await this.service.updateItem(id, dto));
  }

  @Post(':id/adjust-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return new ItemResponseDto(await this.service.adjustStock(id, dto.delta));
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteItem(id);
  }
}
