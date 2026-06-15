import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from '../application/inventory.service';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Inventory — Stock Movements')
@ApiBearerAuth()
@Controller('inventory/stock-movements')
@UseGuards(JwtAuthGuard)
export class StockMovementsController {
  constructor(private readonly service: InventoryService) {}

  @ApiOperation({ summary: 'List recent stock movements' })
  @ApiResponse({ status: 200, type: [StockMovementResponseDto] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  async findAll(@Query('limit') limit?: string) {
    const movements = await this.service.findAllMovements(
      limit ? parseInt(limit, 10) : 50,
    );
    return movements.map((m) => new StockMovementResponseDto(m));
  }
}
