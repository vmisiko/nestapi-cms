import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { InventoryCategoriesController } from '../inventory-categories.controller';
import { InventoryItemsController } from '../inventory-items.controller';
import { DamageReportsController } from '../damage-reports.controller';
import { InventoryService } from '../../application/inventory.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DamageReportStatus } from '../../domain/damage-report';

const CAT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ITEM_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const REPORT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

const mockCategory = {
  id: CAT_ID,
  name: 'Electronics',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockItem = {
  id: ITEM_ID,
  name: 'Projector',
  categoryId: CAT_ID,
  quantity: 5,
  unit: 'pieces',
  minStockLevel: 1,
  location: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockReport = {
  id: REPORT_ID,
  itemId: ITEM_ID,
  quantityDamaged: 1,
  description: 'Screen cracked',
  reportedBy: 'user-uuid',
  status: DamageReportStatus.PENDING,
  resolvedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
  findAllCategories: jest.fn(),
  findCategoryById: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  findAllItems: jest.fn(),
  findItemById: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  adjustStock: jest.fn(),
  deleteItem: jest.fn(),
  findAllDamageReports: jest.fn(),
  findDamageReportById: jest.fn(),
  createDamageReport: jest.fn(),
  updateDamageReport: jest.fn(),
  deleteDamageReport: jest.fn(),
};

describe('Inventory Controllers', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [
        InventoryCategoriesController,
        InventoryItemsController,
        DamageReportsController,
      ],
      providers: [{ provide: InventoryService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Categories ---
  it('GET /inventory/categories → 200', async () => {
    mockService.findAllCategories.mockResolvedValue([mockCategory]);
    const res = await request(app.getHttpServer())
      .get('/inventory/categories')
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /inventory/categories/:id → 200', async () => {
    mockService.findCategoryById.mockResolvedValue(mockCategory);
    const res = await request(app.getHttpServer())
      .get(`/inventory/categories/${CAT_ID}`)
      .expect(200);
    expect(res.body.name).toBe('Electronics');
  });

  it('POST /inventory/categories → 201', async () => {
    mockService.createCategory.mockResolvedValue(mockCategory);
    const res = await request(app.getHttpServer())
      .post('/inventory/categories')
      .send({ name: 'Electronics' })
      .expect(201);
    expect(res.body.name).toBe('Electronics');
  });

  it('POST /inventory/categories → 400 on name too short', async () => {
    await request(app.getHttpServer())
      .post('/inventory/categories')
      .send({ name: 'X' })
      .expect(400);
  });

  it('PATCH /inventory/categories/:id → 200', async () => {
    mockService.updateCategory.mockResolvedValue({
      ...mockCategory,
      name: 'Audio',
    });
    const res = await request(app.getHttpServer())
      .patch(`/inventory/categories/${CAT_ID}`)
      .send({ name: 'Audio' })
      .expect(200);
    expect(res.body.name).toBe('Audio');
  });

  it('DELETE /inventory/categories/:id → 204', async () => {
    mockService.deleteCategory.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/inventory/categories/${CAT_ID}`)
      .expect(204);
  });

  // --- Items ---
  it('GET /inventory/items → 200', async () => {
    mockService.findAllItems.mockResolvedValue([mockItem]);
    const res = await request(app.getHttpServer())
      .get('/inventory/items')
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST /inventory/items → 201', async () => {
    mockService.createItem.mockResolvedValue(mockItem);
    const res = await request(app.getHttpServer())
      .post('/inventory/items')
      .send({ name: 'Projector', categoryId: CAT_ID, unit: 'pieces' })
      .expect(201);
    expect(res.body.name).toBe('Projector');
  });

  it('POST /inventory/items → 400 on invalid body', async () => {
    await request(app.getHttpServer())
      .post('/inventory/items')
      .send({ name: 'P' })
      .expect(400);
  });

  it('POST /inventory/items/:id/adjust-stock → 201', async () => {
    mockService.adjustStock.mockResolvedValue({ ...mockItem, quantity: 10 });
    const res = await request(app.getHttpServer())
      .post(`/inventory/items/${ITEM_ID}/adjust-stock`)
      .send({ delta: 5 })
      .expect(201);
    expect(res.body.quantity).toBe(10);
  });

  it('PATCH /inventory/items/:id → 200', async () => {
    mockService.updateItem.mockResolvedValue({
      ...mockItem,
      name: 'Updated Projector',
    });
    const res = await request(app.getHttpServer())
      .patch(`/inventory/items/${ITEM_ID}`)
      .send({ name: 'Updated Projector' })
      .expect(200);
    expect(res.body.name).toBe('Updated Projector');
  });

  it('DELETE /inventory/items/:id → 204', async () => {
    mockService.deleteItem.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/inventory/items/${ITEM_ID}`)
      .expect(204);
  });

  // --- Damage Reports ---
  it('GET /inventory/damage-reports → 200', async () => {
    mockService.findAllDamageReports.mockResolvedValue([mockReport]);
    const res = await request(app.getHttpServer())
      .get('/inventory/damage-reports')
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /inventory/damage-reports/:id → 200', async () => {
    mockService.findDamageReportById.mockResolvedValue(mockReport);
    const res = await request(app.getHttpServer())
      .get(`/inventory/damage-reports/${REPORT_ID}`)
      .expect(200);
    expect(res.body.status).toBe(DamageReportStatus.PENDING);
  });

  it('POST /inventory/damage-reports → 201', async () => {
    mockService.createDamageReport.mockResolvedValue(mockReport);
    const res = await request(app.getHttpServer())
      .post('/inventory/damage-reports')
      .send({
        itemId: ITEM_ID,
        quantityDamaged: 1,
        description: 'Screen cracked',
      })
      .expect(201);
    expect(res.body.status).toBe(DamageReportStatus.PENDING);
  });

  it('PATCH /inventory/damage-reports/:id → 200', async () => {
    mockService.updateDamageReport.mockResolvedValue({
      ...mockReport,
      status: DamageReportStatus.REVIEWED,
    });
    const res = await request(app.getHttpServer())
      .patch(`/inventory/damage-reports/${REPORT_ID}`)
      .send({ status: DamageReportStatus.REVIEWED })
      .expect(200);
    expect(res.body.status).toBe(DamageReportStatus.REVIEWED);
  });

  it('DELETE /inventory/damage-reports/:id → 204', async () => {
    mockService.deleteDamageReport.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/inventory/damage-reports/${REPORT_ID}`)
      .expect(204);
  });
});
