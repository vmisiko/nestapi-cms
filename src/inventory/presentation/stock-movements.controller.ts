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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Inventory — Stock Movements')
@ApiBearerAuth()
@Controller('inventory/stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockMovementsController {
  constructor(private readonly service: InventoryService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
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
