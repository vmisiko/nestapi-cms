import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AttendanceController } from '../attendance.controller';
import { AttendanceService } from '../../application/attendance.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SessionType } from '../../domain/attendance-session';
import { AttendanceStatus } from '../../domain/attendance-record';

const SESSION_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MEMBER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const RECORD_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

const mockSession = {
  id: SESSION_ID,
  title: 'Sunday Service',
  sessionType: SessionType.SUNDAY_SERVICE,
  sessionDate: new Date('2026-06-01'),
  fellowshipId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRecord = {
  id: RECORD_ID,
  sessionId: SESSION_ID,
  memberId: MEMBER_ID,
  status: AttendanceStatus.PRESENT,
  checkedInAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
  findAllSessions: jest.fn(),
  findSessionById: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  recordAttendance: jest.fn(),
  getSessionAttendance: jest.fn(),
  getMemberAttendance: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
};

describe('AttendanceController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: mockService }],
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

  it('GET /attendance/sessions → 200', async () => {
    mockService.findAllSessions.mockResolvedValue([mockSession]);
    const res = await request(app.getHttpServer())
      .get('/attendance/sessions')
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /attendance/sessions/:id → 200', async () => {
    mockService.findSessionById.mockResolvedValue(mockSession);
    const res = await request(app.getHttpServer())
      .get(`/attendance/sessions/${SESSION_ID}`)
      .expect(200);
    expect(res.body.id).toBe(SESSION_ID);
  });

  it('POST /attendance/sessions → 201', async () => {
    mockService.createSession.mockResolvedValue(mockSession);
    const res = await request(app.getHttpServer())
      .post('/attendance/sessions')
      .send({
        title: 'Sunday Service',
        sessionType: SessionType.SUNDAY_SERVICE,
        sessionDate: '2026-06-01',
      })
      .expect(201);
    expect(res.body.title).toBe('Sunday Service');
  });

  it('POST /attendance/sessions → 400 on invalid body', async () => {
    await request(app.getHttpServer())
      .post('/attendance/sessions')
      .send({ title: 'X' })
      .expect(400);
  });

  it('PATCH /attendance/sessions/:id → 200', async () => {
    mockService.updateSession.mockResolvedValue({
      ...mockSession,
      title: 'Updated',
    });
    const res = await request(app.getHttpServer())
      .patch(`/attendance/sessions/${SESSION_ID}`)
      .send({ title: 'Updated' })
      .expect(200);
    expect(res.body.title).toBe('Updated');
  });

  it('DELETE /attendance/sessions/:id → 204', async () => {
    mockService.deleteSession.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/attendance/sessions/${SESSION_ID}`)
      .expect(204);
  });

  it('GET /attendance/sessions/:id/records → 200', async () => {
    mockService.getSessionAttendance.mockResolvedValue([mockRecord]);
    const res = await request(app.getHttpServer())
      .get(`/attendance/sessions/${SESSION_ID}/records`)
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST /attendance/records → 201', async () => {
    mockService.recordAttendance.mockResolvedValue(mockRecord);
    const res = await request(app.getHttpServer())
      .post('/attendance/records')
      .send({
        sessionId: SESSION_ID,
        memberId: MEMBER_ID,
        status: AttendanceStatus.PRESENT,
      })
      .expect(201);
    expect(res.body.memberId).toBe(MEMBER_ID);
  });

  it('GET /attendance/members/:memberId/records → 200', async () => {
    mockService.getMemberAttendance.mockResolvedValue([mockRecord]);
    const res = await request(app.getHttpServer())
      .get(`/attendance/members/${MEMBER_ID}/records`)
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('PATCH /attendance/records/:id → 200', async () => {
    mockService.updateRecord.mockResolvedValue({
      ...mockRecord,
      status: AttendanceStatus.EXCUSED,
    });
    const res = await request(app.getHttpServer())
      .patch(`/attendance/records/${RECORD_ID}`)
      .send({ status: AttendanceStatus.EXCUSED })
      .expect(200);
    expect(res.body.status).toBe(AttendanceStatus.EXCUSED);
  });

  it('DELETE /attendance/records/:id → 204', async () => {
    mockService.deleteRecord.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/attendance/records/${RECORD_ID}`)
      .expect(204);
  });
});
