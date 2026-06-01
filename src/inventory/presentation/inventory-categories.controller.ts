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
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user';

@Controller('inventory/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryCategoriesController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async findAll() {
    const cats = await this.service.findAllCategories();
    return cats.map((c) => new CategoryResponseDto(c));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new CategoryResponseDto(await this.service.findCategoryById(id));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async create(@Body() dto: CreateCategoryDto) {
    return new CategoryResponseDto(await this.service.createCategory(dto));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return new CategoryResponseDto(await this.service.updateCategory(id, dto));
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteCategory(id);
  }
}
