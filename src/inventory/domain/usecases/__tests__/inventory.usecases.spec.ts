import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { CreateCategoryUseCase } from '../create-category.usecase';
import { GetCategoriesUseCase } from '../get-categories.usecase';
import { GetCategoryByIdUseCase } from '../get-category-by-id.usecase';
import { UpdateCategoryUseCase } from '../update-category.usecase';
import { DeleteCategoryUseCase } from '../delete-category.usecase';
import { CreateItemUseCase } from '../create-item.usecase';
import { GetItemsUseCase } from '../get-items.usecase';
import { UpdateItemUseCase } from '../update-item.usecase';
import { DeleteItemUseCase } from '../delete-item.usecase';
import { AdjustItemStockUseCase } from '../adjust-item-stock.usecase';
import { CreateDamageReportUseCase } from '../create-damage-report.usecase';
import { GetDamageReportsUseCase } from '../get-damage-reports.usecase';
import { GetDamageReportByIdUseCase } from '../get-damage-report-by-id.usecase';
import { UpdateDamageReportUseCase } from '../update-damage-report.usecase';
import { DeleteDamageReportUseCase } from '../delete-damage-report.usecase';
import type { IInventoryCategoryRepository } from '../../i-inventory-category.repository';
import type { IInventoryItemRepository } from '../../i-inventory-item.repository';
import type { IDamageReportRepository } from '../../i-damage-report.repository';
import type { InventoryCategory } from '../../inventory-category';
import type { InventoryItem } from '../../inventory-item';
import { DamageReportStatus, type DamageReport } from '../../damage-report';

const mockCategory: InventoryCategory = {
  id: 'cat-uuid',
  name: 'Electronics',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockItem: InventoryItem = {
  id: 'item-uuid',
  name: 'Projector',
  categoryId: 'cat-uuid',
  quantity: 5,
  unit: 'pieces',
  minStockLevel: 1,
  location: 'Store Room A',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReport: DamageReport = {
  id: 'report-uuid',
  itemId: 'item-uuid',
  quantityDamaged: 1,
  description: 'Screen cracked',
  reportedBy: 'user-uuid',
  status: DamageReportStatus.PENDING,
  resolvedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Inventory Category Use Cases', () => {
  let categoryRepo: jest.Mocked<IInventoryCategoryRepository>;

  beforeEach(() => {
    categoryRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it('GetCategoriesUseCase returns all categories', async () => {
    categoryRepo.findAll.mockResolvedValue(Either.right([mockCategory]));
    const result = await new GetCategoriesUseCase(categoryRepo).execute();
    expect(result.isRight()).toBe(true);
  });

  it('GetCategoryByIdUseCase returns NotFoundError when missing', async () => {
    categoryRepo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Not found')),
    );
    const result = await new GetCategoryByIdUseCase(categoryRepo).execute(
      'bad',
    );
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('CreateCategoryUseCase creates category', async () => {
    categoryRepo.create.mockResolvedValue(Either.right(mockCategory));
    const result = await new CreateCategoryUseCase(categoryRepo).execute({
      name: 'Electronics',
    });
    expect(result.isRight()).toBe(true);
  });

  it('UpdateCategoryUseCase updates category', async () => {
    categoryRepo.update.mockResolvedValue(
      Either.right({ ...mockCategory, name: 'Audio' }),
    );
    const result = await new UpdateCategoryUseCase(categoryRepo).execute(
      'cat-uuid',
      { name: 'Audio' },
    );
    expect(result.isRight()).toBe(true);
  });

  it('DeleteCategoryUseCase deletes category', async () => {
    categoryRepo.delete.mockResolvedValue(Either.right(undefined));
    const result = await new DeleteCategoryUseCase(categoryRepo).execute(
      'cat-uuid',
    );
    expect(result.isRight()).toBe(true);
  });
});

describe('Inventory Item Use Cases', () => {
  let itemRepo: jest.Mocked<IInventoryItemRepository>;

  beforeEach(() => {
    itemRepo = {
      findAll: jest.fn(),
      findByCategoryId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      adjustStock: jest.fn(),
      delete: jest.fn(),
    };
  });

  it('GetItemsUseCase returns all items', async () => {
    itemRepo.findAll.mockResolvedValue(Either.right([mockItem]));
    const result = await new GetItemsUseCase(itemRepo).execute();
    expect(result.isRight()).toBe(true);
  });

  it('CreateItemUseCase creates item', async () => {
    itemRepo.create.mockResolvedValue(Either.right(mockItem));
    const result = await new CreateItemUseCase(itemRepo).execute({
      name: 'Projector',
      categoryId: 'cat-uuid',
      unit: 'pieces',
    });
    expect(result.isRight()).toBe(true);
  });

  it('UpdateItemUseCase updates item', async () => {
    itemRepo.update.mockResolvedValue(
      Either.right({ ...mockItem, name: 'Updated' }),
    );
    const result = await new UpdateItemUseCase(itemRepo).execute('item-uuid', {
      name: 'Updated',
    });
    expect(result.isRight()).toBe(true);
  });

  it('DeleteItemUseCase deletes item', async () => {
    itemRepo.delete.mockResolvedValue(Either.right(undefined));
    const result = await new DeleteItemUseCase(itemRepo).execute('item-uuid');
    expect(result.isRight()).toBe(true);
  });

  describe('AdjustItemStockUseCase', () => {
    it('adjusts stock upward successfully', async () => {
      itemRepo.findById.mockResolvedValue(Either.right(mockItem));
      itemRepo.adjustStock.mockResolvedValue(
        Either.right({ ...mockItem, quantity: 10 }),
      );
      const result = await new AdjustItemStockUseCase(itemRepo).execute(
        'item-uuid',
        5,
      );
      expect(result.isRight()).toBe(true);
    });

    it('rejects negative result below zero', async () => {
      itemRepo.findById.mockResolvedValue(
        Either.right({ ...mockItem, quantity: 2 }),
      );
      const result = await new AdjustItemStockUseCase(itemRepo).execute(
        'item-uuid',
        -5,
      );
      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('BusinessRuleError');
    });

    it('returns NotFoundError when item missing', async () => {
      itemRepo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      const result = await new AdjustItemStockUseCase(itemRepo).execute(
        'bad',
        1,
      );
      expect(result.isLeft()).toBe(true);
    });
  });
});

describe('Damage Report Use Cases', () => {
  let damageRepo: jest.Mocked<IDamageReportRepository>;

  beforeEach(() => {
    damageRepo = {
      findAll: jest.fn(),
      findByItem: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it('GetDamageReportsUseCase returns all reports', async () => {
    damageRepo.findAll.mockResolvedValue(Either.right([mockReport]));
    const result = await new GetDamageReportsUseCase(damageRepo).execute();
    expect(result.isRight()).toBe(true);
  });

  it('GetDamageReportByIdUseCase returns NotFoundError when missing', async () => {
    damageRepo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Not found')),
    );
    const result = await new GetDamageReportByIdUseCase(damageRepo).execute(
      'bad',
    );
    expect(result.isLeft()).toBe(true);
  });

  it('CreateDamageReportUseCase creates report', async () => {
    damageRepo.create.mockResolvedValue(Either.right(mockReport));
    const result = await new CreateDamageReportUseCase(damageRepo).execute({
      itemId: 'item-uuid',
      quantityDamaged: 1,
      description: 'Screen cracked',
      reportedBy: 'user-uuid',
    });
    expect(result.isRight()).toBe(true);
  });

  it('UpdateDamageReportUseCase updates status', async () => {
    damageRepo.update.mockResolvedValue(
      Either.right({ ...mockReport, status: DamageReportStatus.REVIEWED }),
    );
    const result = await new UpdateDamageReportUseCase(damageRepo).execute(
      'report-uuid',
      {
        status: DamageReportStatus.REVIEWED,
      },
    );
    expect(result.isRight()).toBe(true);
  });

  it('DeleteDamageReportUseCase deletes report', async () => {
    damageRepo.delete.mockResolvedValue(Either.right(undefined));
    const result = await new DeleteDamageReportUseCase(damageRepo).execute(
      'report-uuid',
    );
    expect(result.isRight()).toBe(true);
  });
});
