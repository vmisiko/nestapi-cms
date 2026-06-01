import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategoryEntity } from './infrastructure/inventory-category.entity';
import { InventoryItemEntity } from './infrastructure/inventory-item.entity';
import { DamageReportEntity } from './infrastructure/damage-report.entity';
import { InventoryCategoryRepository } from './infrastructure/inventory-category.repository';
import { InventoryItemRepository } from './infrastructure/inventory-item.repository';
import { DamageReportRepository } from './infrastructure/damage-report.repository';
import { InventoryService } from './application/inventory.service';
import { InventoryCategoriesController } from './presentation/inventory-categories.controller';
import { InventoryItemsController } from './presentation/inventory-items.controller';
import { DamageReportsController } from './presentation/damage-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCategoryEntity,
      InventoryItemEntity,
      DamageReportEntity,
    ]),
  ],
  controllers: [
    InventoryCategoriesController,
    InventoryItemsController,
    DamageReportsController,
  ],
  providers: [
    InventoryCategoryRepository,
    InventoryItemRepository,
    DamageReportRepository,
    InventoryService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
