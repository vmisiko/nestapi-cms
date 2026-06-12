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
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Inventory — Items')
@ApiBearerAuth()
@Controller('inventory/items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryItemsController {
  constructor(private readonly service: InventoryService) {}

  @ApiOperation({ summary: 'List all inventory items' })
  @ApiResponse({ status: 200, type: [ItemResponseDto] })
  @Get()
  async findAll() {
    const items = await this.service.findAllItems();
    return items.map((i) => new ItemResponseDto(i));
  }

  @ApiOperation({ summary: 'Get an inventory item by ID' })
  @ApiResponse({ status: 200, type: ItemResponseDto })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new ItemResponseDto(await this.service.findItemById(id));
  }

  @ApiOperation({ summary: 'Create a new inventory item (admin+)' })
  @ApiResponse({ status: 201, type: ItemResponseDto })
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateItemDto) {
    return new ItemResponseDto(await this.service.createItem(dto));
  }

  @ApiOperation({ summary: 'Update an inventory item (admin+)' })
  @ApiResponse({ status: 200, type: ItemResponseDto })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return new ItemResponseDto(await this.service.updateItem(id, dto));
  }

  @ApiOperation({
    summary: 'Adjust stock quantity for an inventory item (admin+)',
  })
  @ApiResponse({ status: 201, type: ItemResponseDto })
  @Post(':id/adjust-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return new ItemResponseDto(await this.service.adjustStock(id, dto.adjustment));
  }

  @ApiOperation({ summary: 'Delete an inventory item (super_admin only)' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteItem(id);
  }
}
