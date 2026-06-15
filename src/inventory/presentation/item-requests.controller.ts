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
import { CreateItemRequestDto } from './dto/create-item-request.dto';
import { UpdateItemRequestStatusDto } from './dto/update-item-request-status.dto';
import { ItemRequestResponseDto } from './dto/item-request-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@ApiTags('Inventory — Item Requests')
@ApiBearerAuth()
@Controller('inventory/requests')
@UseGuards(JwtAuthGuard)
export class ItemRequestsController {
  constructor(private readonly service: InventoryService) {}

  @ApiOperation({ summary: 'List all item requests' })
  @ApiResponse({ status: 200, type: [ItemRequestResponseDto] })
  @Get()
  async findAll() {
    const requests = await this.service.findAllRequests();
    return requests.map((r) => new ItemRequestResponseDto(r));
  }

  @ApiOperation({ summary: 'Submit a new item request' })
  @ApiResponse({ status: 201, type: ItemRequestResponseDto })
  @Post()
  async create(@Body() dto: CreateItemRequestDto) {
    return new ItemRequestResponseDto(await this.service.createRequest(dto));
  }

  @ApiOperation({ summary: 'Update item request status (admin+)' })
  @ApiResponse({ status: 200, type: ItemRequestResponseDto })
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemRequestStatusDto,
  ) {
    return new ItemRequestResponseDto(
      await this.service.updateRequestStatus(id, dto.status),
    );
  }

  @ApiOperation({ summary: 'Delete an item request (admin+)' })
  @ApiResponse({ status: 204 })
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteRequest(id);
  }
}
