import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MessagingController } from '../messaging.controller';
import { MessagingService } from '../../application/messaging.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
} from '../../domain/message';
import { DeliveryStatus } from '../../domain/message-delivery';

const MSG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const mockMessage = {
  id: MSG_ID,
  title: 'Announcement',
  body: 'Body text',
  type: MessageType.ANNOUNCEMENT,
  targetGroup: MessageTargetGroup.ALL,
  targetId: null,
  status: MessageStatus.DRAFT,
  scheduledAt: null,
  sentAt: null,
  createdBy: 'user-uuid',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSendResult = {
  messageId: MSG_ID,
  totalRecipients: 10,
  sent: 9,
  failed: 1,
  skipped: 0,
};

const mockDelivery = {
  id: 'del-uuid',
  messageId: MSG_ID,
  memberId: 'mem-uuid',
  memberName: 'John Doe',
  phone: '254700000001',
  text: 'Body text',
  status: DeliveryStatus.SENT,
  uwaziRef: 'ref-123',
  failureReason: null,
  sentAt: new Date(),
  deliveredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  send: jest.fn(),
  delete: jest.fn(),
  getDeliveries: jest.fn(),
  getDeliveryStats: jest.fn(),
  handleDlr: jest.fn(),
};

describe('MessagingController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [{ provide: MessagingService, useValue: mockService }],
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

  it('GET /messaging → 200 with array', async () => {
    mockService.findAll.mockResolvedValue([mockMessage]);
    const res = await request(app.getHttpServer())
      .get('/messaging')
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /messaging/:id → 200', async () => {
    mockService.findById.mockResolvedValue(mockMessage);
    const res = await request(app.getHttpServer())
      .get(`/messaging/${MSG_ID}`)
      .expect(200);
    expect(res.body.id).toBe(MSG_ID);
  });

  it('POST /messaging → 201 with message', async () => {
    mockService.create.mockResolvedValue(mockMessage);
    const res = await request(app.getHttpServer())
      .post('/messaging')
      .send({
        title: 'Announcement',
        body: 'Body text',
        type: MessageType.ANNOUNCEMENT,
        targetGroup: MessageTargetGroup.ALL,
      })
      .expect(201);
    expect(res.body.title).toBe('Announcement');
  });

  it('POST /messaging → 400 on invalid body', async () => {
    await request(app.getHttpServer())
      .post('/messaging')
      .send({ title: 'X' })
      .expect(400);
  });

  it('PATCH /messaging/:id → 200 with updated message', async () => {
    mockService.update.mockResolvedValue({ ...mockMessage, title: 'Updated' });
    const res = await request(app.getHttpServer())
      .patch(`/messaging/${MSG_ID}`)
      .send({ title: 'Updated' })
      .expect(200);
    expect(res.body.title).toBe('Updated');
  });

  it('POST /messaging/:id/send → 201 with send result', async () => {
    mockService.send.mockResolvedValue(mockSendResult);
    const res = await request(app.getHttpServer())
      .post(`/messaging/${MSG_ID}/send`)
      .expect(201);
    expect(res.body.totalRecipients).toBe(10);
    expect(res.body.sent).toBe(9);
    expect(res.body.failed).toBe(1);
  });

  it('DELETE /messaging/:id → 204', async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/messaging/${MSG_ID}`)
      .expect(204);
  });

  it('GET /messaging/:id/deliveries → 200 with delivery list', async () => {
    mockService.getDeliveries.mockResolvedValue([mockDelivery]);
    const res = await request(app.getHttpServer())
      .get(`/messaging/${MSG_ID}/deliveries`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe(DeliveryStatus.SENT);
  });

  it('GET /messaging/:id/deliveries/stats → 200 with stats', async () => {
    mockService.getDeliveryStats.mockResolvedValue({
      total: 10,
      pending: 0,
      sent: 8,
      delivered: 1,
      failed: 1,
    });
    const res = await request(app.getHttpServer())
      .get(`/messaging/${MSG_ID}/deliveries/stats`)
      .expect(200);
    expect(res.body.total).toBe(10);
    expect(res.body.sent).toBe(8);
  });

  it('POST /messaging/dlr → 200 acknowledged', async () => {
    mockService.handleDlr.mockResolvedValue(undefined);
    const res = await request(app.getHttpServer())
      .post('/messaging/dlr')
      .send({
        id: 'ref-123',
        to: '254700000001',
        status: 'delivered',
        delivered_at: '2026-06-01T12:00:00Z',
      })
      .expect(200);
    expect(res.body.received).toBe(true);
    expect(mockService.handleDlr).toHaveBeenCalledWith(
      'ref-123',
      'delivered',
      expect.any(Date),
    );
  });

  it('POST /messaging/dlr → 200 on failed status', async () => {
    mockService.handleDlr.mockResolvedValue(undefined);
    const res = await request(app.getHttpServer())
      .post('/messaging/dlr')
      .send({ id: 'ref-456', to: '254700000002', status: 'failed' })
      .expect(200);
    expect(res.body.received).toBe(true);
    expect(mockService.handleDlr).toHaveBeenCalledWith(
      'ref-456',
      'failed',
      undefined,
    );
  });
});
