import { Injectable } from '@nestjs/common';
import { InventoryCategoryRepository } from '../infrastructure/inventory-category.repository';
import { InventoryItemRepository } from '../infrastructure/inventory-item.repository';
import { DamageReportRepository } from '../infrastructure/damage-report.repository';
import { StockMovementRepository } from '../infrastructure/stock-movement.repository';
import { ItemRequestRepository } from '../infrastructure/item-request.repository';
import { CreateCategoryUseCase } from '../domain/usecases/create-category.usecase';
import { GetCategoriesUseCase } from '../domain/usecases/get-categories.usecase';
import { GetCategoryByIdUseCase } from '../domain/usecases/get-category-by-id.usecase';
import { UpdateCategoryUseCase } from '../domain/usecases/update-category.usecase';
import { DeleteCategoryUseCase } from '../domain/usecases/delete-category.usecase';
import { CreateItemUseCase } from '../domain/usecases/create-item.usecase';
import { GetItemsUseCase } from '../domain/usecases/get-items.usecase';
import { GetItemByIdUseCase } from '../domain/usecases/get-item-by-id.usecase';
import { UpdateItemUseCase } from '../domain/usecases/update-item.usecase';
import { DeleteItemUseCase } from '../domain/usecases/delete-item.usecase';
import { AdjustItemStockUseCase } from '../domain/usecases/adjust-item-stock.usecase';
import { CreateStockMovementUseCase } from '../domain/usecases/create-stock-movement.usecase';
import { GetStockMovementsUseCase } from '../domain/usecases/get-stock-movements.usecase';
import { CreateItemRequestUseCase } from '../domain/usecases/create-item-request.usecase';
import { GetItemRequestsUseCase } from '../domain/usecases/get-item-requests.usecase';
import { UpdateItemRequestStatusUseCase } from '../domain/usecases/update-item-request-status.usecase';
import { DeleteItemRequestUseCase } from '../domain/usecases/delete-item-request.usecase';
import { CreateDamageReportUseCase } from '../domain/usecases/create-damage-report.usecase';
import { GetDamageReportsUseCase } from '../domain/usecases/get-damage-reports.usecase';
import { GetDamageReportByIdUseCase } from '../domain/usecases/get-damage-report-by-id.usecase';
import { UpdateDamageReportUseCase } from '../domain/usecases/update-damage-report.usecase';
import { DeleteDamageReportUseCase } from '../domain/usecases/delete-damage-report.usecase';
import type { CreateCategoryDto } from '../presentation/dto/create-category.dto';
import type { UpdateCategoryDto } from '../presentation/dto/update-category.dto';
import type { CreateItemDto } from '../presentation/dto/create-item.dto';
import type { UpdateItemDto } from '../presentation/dto/update-item.dto';
import type { CreateDamageReportDto } from '../presentation/dto/create-damage-report.dto';
import type { UpdateDamageReportDto } from '../presentation/dto/update-damage-report.dto';
import type { InventoryCategory } from '../domain/inventory-category';
import type { InventoryItem } from '../domain/inventory-item';
import type { DamageReport } from '../domain/damage-report';
import { DamageStatus } from '../domain/damage-report';
import type { StockMovement } from '../domain/stock-movement';
import type { ItemRequest, ItemRequestStatus } from '../domain/item-request';
import type { CreateItemRequestDto } from '../presentation/dto/create-item-request.dto';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class InventoryService {
  private readonly getCategoriesUseCase: GetCategoriesUseCase;
  private readonly getCategoryByIdUseCase: GetCategoryByIdUseCase;
  private readonly createCategoryUseCase: CreateCategoryUseCase;
  private readonly updateCategoryUseCase: UpdateCategoryUseCase;
  private readonly deleteCategoryUseCase: DeleteCategoryUseCase;
  private readonly getItemsUseCase: GetItemsUseCase;
  private readonly getItemByIdUseCase: GetItemByIdUseCase;
  private readonly createItemUseCase: CreateItemUseCase;
  private readonly updateItemUseCase: UpdateItemUseCase;
  private readonly deleteItemUseCase: DeleteItemUseCase;
  private readonly adjustStockUseCase: AdjustItemStockUseCase;
  private readonly createMovementUseCase: CreateStockMovementUseCase;
  private readonly getMovementsUseCase: GetStockMovementsUseCase;
  private readonly getRequestsUseCase: GetItemRequestsUseCase;
  private readonly createRequestUseCase: CreateItemRequestUseCase;
  private readonly updateRequestStatusUseCase: UpdateItemRequestStatusUseCase;
  private readonly deleteRequestUseCase: DeleteItemRequestUseCase;
  private readonly getDamageReportsUseCase: GetDamageReportsUseCase;
  private readonly getDamageReportByIdUseCase: GetDamageReportByIdUseCase;
  private readonly createDamageReportUseCase: CreateDamageReportUseCase;
  private readonly updateDamageReportUseCase: UpdateDamageReportUseCase;
  private readonly deleteDamageReportUseCase: DeleteDamageReportUseCase;

  constructor(
    readonly categoryRepo: InventoryCategoryRepository,
    readonly itemRepo: InventoryItemRepository,
    readonly damageRepo: DamageReportRepository,
    readonly movementRepo: StockMovementRepository,
    readonly requestRepo: ItemRequestRepository,
  ) {
    this.getCategoriesUseCase = new GetCategoriesUseCase(categoryRepo);
    this.getCategoryByIdUseCase = new GetCategoryByIdUseCase(categoryRepo);
    this.createCategoryUseCase = new CreateCategoryUseCase(categoryRepo);
    this.updateCategoryUseCase = new UpdateCategoryUseCase(categoryRepo);
    this.deleteCategoryUseCase = new DeleteCategoryUseCase(categoryRepo);
    this.getItemsUseCase = new GetItemsUseCase(itemRepo);
    this.getItemByIdUseCase = new GetItemByIdUseCase(itemRepo);
    this.createItemUseCase = new CreateItemUseCase(itemRepo);
    this.updateItemUseCase = new UpdateItemUseCase(itemRepo);
    this.deleteItemUseCase = new DeleteItemUseCase(itemRepo);
    this.adjustStockUseCase = new AdjustItemStockUseCase(itemRepo);
    this.createMovementUseCase = new CreateStockMovementUseCase(movementRepo);
    this.getMovementsUseCase = new GetStockMovementsUseCase(movementRepo);
    this.getRequestsUseCase = new GetItemRequestsUseCase(requestRepo);
    this.createRequestUseCase = new CreateItemRequestUseCase(requestRepo);
    this.updateRequestStatusUseCase = new UpdateItemRequestStatusUseCase(
      requestRepo,
    );
    this.deleteRequestUseCase = new DeleteItemRequestUseCase(requestRepo);
    this.getDamageReportsUseCase = new GetDamageReportsUseCase(damageRepo);
    this.getDamageReportByIdUseCase = new GetDamageReportByIdUseCase(
      damageRepo,
    );
    this.createDamageReportUseCase = new CreateDamageReportUseCase(damageRepo);
    this.updateDamageReportUseCase = new UpdateDamageReportUseCase(damageRepo);
    this.deleteDamageReportUseCase = new DeleteDamageReportUseCase(damageRepo);
  }

  // --- Categories ---
  async findAllCategories(): Promise<InventoryCategory[]> {
    const r = await this.getCategoriesUseCase.execute();
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findCategoryById(id: string): Promise<InventoryCategory> {
    const r = await this.getCategoryByIdUseCase.execute(id);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async createCategory(dto: CreateCategoryDto): Promise<InventoryCategory> {
    const r = await this.createCategoryUseCase.execute(dto);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<InventoryCategory> {
    const r = await this.updateCategoryUseCase.execute(id, dto);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async deleteCategory(id: string): Promise<void> {
    const r = await this.deleteCategoryUseCase.execute(id);
    r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  // --- Items ---
  async findAllItems(): Promise<InventoryItem[]> {
    const r = await this.getItemsUseCase.execute();
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findItemById(id: string): Promise<InventoryItem> {
    const r = await this.getItemByIdUseCase.execute(id);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async createItem(dto: CreateItemDto): Promise<InventoryItem> {
    const r = await this.createItemUseCase.execute(dto);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateItem(id: string, dto: UpdateItemDto): Promise<InventoryItem> {
    const r = await this.updateItemUseCase.execute(id, dto);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async adjustStock(
    id: string,
    delta: number,
    options: { reason?: string; performedBy?: string } = {},
  ): Promise<InventoryItem> {
    const r = await this.adjustStockUseCase.execute(id, delta);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      async (item) => {
        const type = delta > 0 ? 'in' : delta < 0 ? 'out' : 'adjustment';
        await this.createMovementUseCase.execute({
          itemId: item.id,
          itemName: item.name,
          type,
          quantity: delta,
          reason: options.reason ?? null,
          performedBy: options.performedBy ?? 'System',
        });
        return item;
      },
    );
  }

  async findAllMovements(limit = 50): Promise<StockMovement[]> {
    const r = await this.getMovementsUseCase.execute(limit);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async deleteItem(id: string): Promise<void> {
    const r = await this.deleteItemUseCase.execute(id);
    r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  // --- Item Requests ---
  async findAllRequests(): Promise<ItemRequest[]> {
    const r = await this.getRequestsUseCase.execute();
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async createRequest(dto: CreateItemRequestDto): Promise<ItemRequest> {
    const initials = dto.requester
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const item = await this.findItemById(dto.itemId);
    const r = await this.createRequestUseCase.execute({
      requester: dto.requester,
      requesterAvatar: initials,
      itemId: dto.itemId,
      itemName: item.name,
      quantity: dto.quantity,
      reason: dto.reason ?? null,
      requestDate: dto.requestDate,
      returnDate: dto.returnDate,
    });
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateRequestStatus(
    id: string,
    status: ItemRequestStatus,
  ): Promise<ItemRequest> {
    // Fetch current request so we know the previous status, itemId, and quantity
    const currentR = await this.requestRepo.findById(id);
    const current = currentR.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );

    const r = await this.updateRequestStatusUseCase.execute(id, status);
    const updated = r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );

    // Adjust stock based on transition
    if (current.status !== 'approved' && status === 'approved') {
      // Item going out — deduct from available stock
      await this.adjustStock(current.itemId, -current.quantity, {
        reason: `Approved request by ${current.requester}`,
        performedBy: current.requester,
      });
    } else if (current.status === 'approved' && status === 'returned') {
      // Item coming back — restore available stock
      await this.adjustStock(current.itemId, current.quantity, {
        reason: `Returned by ${current.requester}`,
        performedBy: current.requester,
      });
    }

    return updated;
  }

  async deleteRequest(id: string): Promise<void> {
    const r = await this.deleteRequestUseCase.execute(id);
    r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  // --- Damage Reports ---
  async findAllDamageReports(): Promise<DamageReport[]> {
    const r = await this.getDamageReportsUseCase.execute();
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findDamageReportById(id: string): Promise<DamageReport> {
    const r = await this.getDamageReportByIdUseCase.execute(id);
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async createDamageReport(dto: CreateDamageReportDto): Promise<DamageReport> {
    const r = await this.createDamageReportUseCase.execute({
      itemId: dto.itemId,
      reportedByName: dto.reportedByName,
      damageType: dto.damageType,
      severity: dto.severity,
      quantityAffected: dto.quantityAffected,
      description: dto.description,
      reportDate: dto.reportDate ?? new Date().toISOString().slice(0, 10),
      notes: dto.notes,
    });
    return r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateDamageReport(
    id: string,
    dto: UpdateDamageReportDto,
  ): Promise<DamageReport> {
    const current = await this.findDamageReportById(id);

    const r = await this.updateDamageReportUseCase.execute(id, {
      status: dto.status,
      resolution: dto.resolution,
      notes: dto.notes,
    });
    const updated = r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );

    if (
      current.status !== DamageStatus.WRITTEN_OFF &&
      dto.status === DamageStatus.WRITTEN_OFF
    ) {
      await this.adjustStock(current.itemId, -current.quantityAffected, {
        reason: `Written off — ${current.damageType} (${current.severity}): ${current.description.slice(0, 60)}`,
        performedBy: current.reportedByName,
      });
    }

    return updated;
  }

  async deleteDamageReport(id: string): Promise<void> {
    const r = await this.deleteDamageReportUseCase.execute(id);
    r.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
