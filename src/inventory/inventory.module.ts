import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategoryEntity } from './infrastructure/inventory-category.entity';
import { InventoryItemEntity } from './infrastructure/inventory-item.entity';
import { DamageReportEntity } from './infrastructure/damage-report.entity';
import { StockMovementEntity } from './infrastructure/stock-movement.entity';
import { ItemRequestEntity } from './infrastructure/item-request.entity';
import { InventoryCategoryRepository } from './infrastructure/inventory-category.repository';
import { InventoryItemRepository } from './infrastructure/inventory-item.repository';
import { DamageReportRepository } from './infrastructure/damage-report.repository';
import { StockMovementRepository } from './infrastructure/stock-movement.repository';
import { ItemRequestRepository } from './infrastructure/item-request.repository';
import { InventoryService } from './application/inventory.service';
import { InventoryCategoriesController } from './presentation/inventory-categories.controller';
import { InventoryItemsController } from './presentation/inventory-items.controller';
import { DamageReportsController } from './presentation/damage-reports.controller';
import { StockMovementsController } from './presentation/stock-movements.controller';
import { ItemRequestsController } from './presentation/item-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCategoryEntity,
      InventoryItemEntity,
      DamageReportEntity,
      StockMovementEntity,
      ItemRequestEntity,
    ]),
  ],
  controllers: [
    InventoryCategoriesController,
    InventoryItemsController,
    DamageReportsController,
    StockMovementsController,
    ItemRequestsController,
  ],
  providers: [
    InventoryCategoryRepository,
    InventoryItemRepository,
    DamageReportRepository,
    StockMovementRepository,
    ItemRequestRepository,
    InventoryService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
