import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryCategoryRepository } from '../inventory-category.repository';
import { InventoryItemRepository } from '../inventory-item.repository';
import { DamageReportRepository } from '../damage-report.repository';
import { InventoryCategoryEntity } from '../inventory-category.entity';
import { InventoryItemEntity } from '../inventory-item.entity';
import { DamageReportEntity } from '../damage-report.entity';
import { DamageReportStatus } from '../../domain/damage-report';

const catEntity = {
  id: 'cat-uuid',
  name: 'Electronics',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as InventoryCategoryEntity;
const itemEntity = {
  id: 'item-uuid',
  name: 'Projector',
  categoryId: 'cat-uuid',
  quantity: 5,
  unit: 'pieces',
  minStockLevel: 1,
  location: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as InventoryItemEntity;
const reportEntity = {
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
} as unknown as DamageReportEntity;

describe('InventoryCategoryRepository', () => {
  let repo: InventoryCategoryRepository;
  let ormMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    ormMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        InventoryCategoryRepository,
        {
          provide: getRepositoryToken(InventoryCategoryEntity),
          useValue: ormMock,
        },
      ],
    }).compile();
    repo = module.get(InventoryCategoryRepository);
  });

  it('findAll returns right with categories', async () => {
    ormMock.find.mockResolvedValue([catEntity]);
    const result = await repo.findAll();
    expect(result.isRight()).toBe(true);
  });

  it('findById returns NotFoundError when missing', async () => {
    ormMock.findOne.mockResolvedValue(null);
    const result = await repo.findById('bad');
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('create saves category', async () => {
    ormMock.create.mockReturnValue(catEntity);
    ormMock.save.mockResolvedValue(catEntity);
    const result = await repo.create({ name: 'Electronics' });
    expect(result.isRight()).toBe(true);
  });

  it('delete returns NotFoundError when affected is 0', async () => {
    ormMock.delete.mockResolvedValue({ affected: 0 });
    const result = await repo.delete('missing');
    expect(result.isLeft()).toBe(true);
  });
});

describe('InventoryItemRepository', () => {
  let repo: InventoryItemRepository;
  let ormMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    ormMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        InventoryItemRepository,
        { provide: getRepositoryToken(InventoryItemEntity), useValue: ormMock },
      ],
    }).compile();
    repo = module.get(InventoryItemRepository);
  });

  it('findAll returns items', async () => {
    ormMock.find.mockResolvedValue([itemEntity]);
    const result = await repo.findAll();
    expect(result.isRight()).toBe(true);
  });

  it('findByCategoryId returns items for category', async () => {
    ormMock.find.mockResolvedValue([itemEntity]);
    const result = await repo.findByCategoryId('cat-uuid');
    expect(result.isRight()).toBe(true);
  });

  it('findById returns NotFoundError when missing', async () => {
    ormMock.findOne.mockResolvedValue(null);
    const result = await repo.findById('bad');
    expect(result.isLeft()).toBe(true);
  });

  it('adjustStock calls query builder', async () => {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };
    ormMock.createQueryBuilder.mockReturnValue(qb);
    ormMock.findOne.mockResolvedValue(itemEntity);
    const result = await repo.adjustStock('item-uuid', 5);
    expect(result.isRight()).toBe(true);
    expect(qb.execute).toHaveBeenCalled();
  });
});

describe('DamageReportRepository', () => {
  let repo: DamageReportRepository;
  let ormMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    ormMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        DamageReportRepository,
        { provide: getRepositoryToken(DamageReportEntity), useValue: ormMock },
      ],
    }).compile();
    repo = module.get(DamageReportRepository);
  });

  it('findAll returns reports', async () => {
    ormMock.find.mockResolvedValue([reportEntity]);
    const result = await repo.findAll();
    expect(result.isRight()).toBe(true);
  });

  it('findByItem returns reports for item', async () => {
    ormMock.find.mockResolvedValue([reportEntity]);
    const result = await repo.findByItem('item-uuid');
    expect(result.isRight()).toBe(true);
  });

  it('create saves report', async () => {
    ormMock.create.mockReturnValue(reportEntity);
    ormMock.save.mockResolvedValue(reportEntity);
    const result = await repo.create({
      itemId: 'item-uuid',
      quantityDamaged: 1,
      description: 'Screen cracked',
      reportedBy: 'user-uuid',
    });
    expect(result.isRight()).toBe(true);
  });

  it('delete returns NotFoundError when affected is 0', async () => {
    ormMock.delete.mockResolvedValue({ affected: 0 });
    const result = await repo.delete('missing');
    expect(result.isLeft()).toBe(true);
  });
});
