import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import { InventoryCategoryRepository } from '../../infrastructure/inventory-category.repository';
import { InventoryItemRepository } from '../../infrastructure/inventory-item.repository';
import { DamageReportRepository } from '../../infrastructure/damage-report.repository';
import { StockMovementRepository } from '../../infrastructure/stock-movement.repository';
import { ItemRequestRepository } from '../../infrastructure/item-request.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import {
  DamageStatus,
  DamageType,
  DamageSeverity,
} from '../../domain/damage-report';

const mockCategoryRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockItemRepo = {
  findAll: jest.fn(),
  findByCategoryId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  adjustStock: jest.fn(),
  delete: jest.fn(),
};

const mockDamageRepo = {
  findAll: jest.fn(),
  findByItem: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockMovementRepo = {
  findAll: jest.fn(),
  create: jest.fn(),
};

const mockRequestRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
};

const mockCategory = {
  id: 'cat-uuid',
  name: 'Electronics',
  description: null,
  leaderId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockItem = {
  id: 'item-uuid',
  name: 'Projector',
  code: 'PROJ-001',
  categoryId: 'cat-uuid',
  totalQty: 5,
  availableQty: 5,
  condition: 'good',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReport = {
  id: 'report-uuid',
  itemId: 'item-uuid',
  reportedByName: 'Jane Doe',
  damageType: DamageType.BROKEN,
  severity: DamageSeverity.MINOR,
  quantityAffected: 1,
  description: 'Screen cracked',
  reportDate: '2026-09-01',
  status: DamageStatus.PENDING,
  resolution: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryCategoryRepository, useValue: mockCategoryRepo },
        { provide: InventoryItemRepository, useValue: mockItemRepo },
        { provide: DamageReportRepository, useValue: mockDamageRepo },
        { provide: StockMovementRepository, useValue: mockMovementRepo },
        { provide: ItemRequestRepository, useValue: mockRequestRepo },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  describe('findAllCategories', () => {
    it('returns categories', async () => {
      mockCategoryRepo.findAll.mockResolvedValue(Either.right([mockCategory]));
      const result = await service.findAllCategories();
      expect(result).toHaveLength(1);
    });

    it('throws on error', async () => {
      mockCategoryRepo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB')),
      );
      await expect(service.findAllCategories()).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('createCategory', () => {
    it('creates category', async () => {
      mockCategoryRepo.create.mockResolvedValue(Either.right(mockCategory));
      const result = await service.createCategory({ name: 'Electronics' });
      expect(result.id).toBe('cat-uuid');
    });
  });

  describe('findAllItems', () => {
    it('returns items', async () => {
      mockItemRepo.findAll.mockResolvedValue(Either.right([mockItem]));
      const result = await service.findAllItems();
      expect(result).toHaveLength(1);
    });
  });

  describe('adjustStock', () => {
    it('adjusts stock upward', async () => {
      mockItemRepo.findById.mockResolvedValue(Either.right(mockItem));
      mockItemRepo.adjustStock.mockResolvedValue(
        Either.right({ ...mockItem, availableQty: 10 }),
      );
      const result = await service.adjustStock('item-uuid', 5);
      expect(result.availableQty).toBe(10);
    });

    it('throws 422 when stock would go negative', async () => {
      mockItemRepo.findById.mockResolvedValue(
        Either.right({ ...mockItem, availableQty: 2 }),
      );
      await expect(
        service.adjustStock('item-uuid', -10),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('findAllDamageReports', () => {
    it('returns reports', async () => {
      mockDamageRepo.findAll.mockResolvedValue(Either.right([mockReport]));
      const result = await service.findAllDamageReports();
      expect(result).toHaveLength(1);
    });
  });

  describe('createDamageReport', () => {
    it('creates report', async () => {
      mockDamageRepo.create.mockResolvedValue(Either.right(mockReport));
      const result = await service.createDamageReport({
        itemId: 'item-uuid',
        reportedByName: 'Jane Doe',
        damageType: DamageType.BROKEN,
        severity: DamageSeverity.MINOR,
        quantityAffected: 1,
        description: 'Screen cracked',
      });
      expect(result.reportedByName).toBe('Jane Doe');
    });
  });

  describe('deleteDamageReport', () => {
    it('deletes report without error', async () => {
      mockDamageRepo.delete.mockResolvedValue(Either.right(undefined));
      await expect(
        service.deleteDamageReport('report-uuid'),
      ).resolves.toBeUndefined();
    });
  });
});
