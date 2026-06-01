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

const mockService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  send: jest.fn(),
  delete: jest.fn(),
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

  it('POST /messaging/:id/send → 204', async () => {
    mockService.send.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post(`/messaging/${MSG_ID}/send`)
      .expect(204);
  });

  it('DELETE /messaging/:id → 204', async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/messaging/${MSG_ID}`)
      .expect(204);
  });
});
