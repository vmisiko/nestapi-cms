import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { MessageRepository } from '../../infrastructure/message.repository';
import { MessageDeliveryRepository } from '../../infrastructure/message-delivery.repository';
import { SmsProviderService } from '../../infrastructure/sms-provider.service';
import { TargetGroupResolverService } from '../target-group-resolver.service';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
} from '../../domain/message';
import { DeliveryStatus } from '../../domain/message-delivery';

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  markSent: jest.fn(),
  delete: jest.fn(),
};

const mockDeliveryRepo = {
  createMany: jest.fn(),
  findByMessage: jest.fn(),
  findById: jest.fn(),
  findByUwaziRef: jest.fn(),
  updateStatus: jest.fn(),
  getStats: jest.fn(),
};

const mockUwazii = {
  sendBatch: jest.fn(),
};

const mockResolver = {
  resolve: jest.fn(),
};

const mockMessage = {
  id: 'msg-uuid',
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

const mockDelivery = {
  id: 'del-uuid',
  messageId: 'msg-uuid',
  memberId: 'mem-uuid',
  memberName: 'John Doe',
  phone: '254700000001',
  text: 'Body text',
  status: DeliveryStatus.PENDING,
  uwaziRef: null,
  failureReason: null,
  sentAt: null,
  deliveredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: MessageRepository, useValue: mockRepo },
        { provide: MessageDeliveryRepository, useValue: mockDeliveryRepo },
        { provide: SmsProviderService, useValue: mockUwazii },
        { provide: TargetGroupResolverService, useValue: mockResolver },
      ],
    }).compile();
    service = module.get(MessagingService);
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('returns messages on success', async () => {
      mockRepo.findAll.mockResolvedValue(Either.right([mockMessage]));
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('throws HttpException on error', async () => {
      mockRepo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );
      await expect(service.findAll()).rejects.toBeInstanceOf(HttpException);
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('returns message when found', async () => {
      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      const result = await service.findById('msg-uuid');
      expect(result.id).toBe('msg-uuid');
    });

    it('throws 404 when not found', async () => {
      mockRepo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      await expect(service.findById('bad')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('creates message with createdBy', async () => {
      mockRepo.create.mockResolvedValue(Either.right(mockMessage));
      const result = await service.create(
        {
          title: 'Announcement',
          body: 'Body text',
          type: MessageType.ANNOUNCEMENT,
          targetGroup: MessageTargetGroup.ALL,
        },
        'user-uuid',
      );
      expect(result.id).toBe('msg-uuid');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'user-uuid' }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // send
  // ---------------------------------------------------------------------------
  describe('send', () => {
    it('happy path: resolves recipients, dispatches to Uwazii, marks message sent and returns summary', async () => {
      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      mockResolver.resolve.mockResolvedValue([
        { memberId: 'mem-uuid', memberName: 'John Doe', phone: '254700000001' },
      ]);
      mockDeliveryRepo.createMany.mockResolvedValue(
        Either.right([mockDelivery]),
      );
      mockUwazii.sendBatch.mockResolvedValue([
        {
          to: '254700000001',
          ref: 'uwazii-ref-1',
          accepted: true,
          reason: null,
        },
      ]);
      mockDeliveryRepo.updateStatus.mockResolvedValue(
        Either.right({ ...mockDelivery, status: DeliveryStatus.SENT }),
      );
      mockRepo.markSent.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );

      const result = await service.send('msg-uuid');

      expect(result.messageId).toBe('msg-uuid');
      expect(result.totalRecipients).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockRepo.markSent).toHaveBeenCalledWith('msg-uuid', expect.any(Date));
      expect(mockDeliveryRepo.updateStatus).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({ status: DeliveryStatus.SENT }),
      );
    });

    it('throws HttpException when message is already sent', async () => {
      mockRepo.findById.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      await expect(service.send('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(mockResolver.resolve).not.toHaveBeenCalled();
    });

    it('throws HttpException when no recipients resolved', async () => {
      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      mockResolver.resolve.mockResolvedValue([]);
      await expect(service.send('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(mockDeliveryRepo.createMany).not.toHaveBeenCalled();
    });

    it('partial failure: counts sent and failed correctly, still marks message sent', async () => {
      const recipient1 = { memberId: 'mem-1', memberName: 'Alice', phone: '254700000001' };
      const recipient2 = { memberId: 'mem-2', memberName: 'Bob', phone: '254700000002' };
      const delivery1 = { ...mockDelivery, id: 'del-1', memberId: 'mem-1', phone: '254700000001' };
      const delivery2 = { ...mockDelivery, id: 'del-2', memberId: 'mem-2', phone: '254700000002' };

      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      mockResolver.resolve.mockResolvedValue([recipient1, recipient2]);
      mockDeliveryRepo.createMany.mockResolvedValue(
        Either.right([delivery1, delivery2]),
      );
      mockUwazii.sendBatch.mockResolvedValue([
        { to: '254700000001', ref: 'ref-1', accepted: true, reason: null },
        { to: '254700000002', ref: null, accepted: false, reason: 'Invalid number' },
      ]);
      mockDeliveryRepo.updateStatus.mockResolvedValue(Either.right(mockDelivery));
      mockRepo.markSent.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );

      const result = await service.send('msg-uuid');

      expect(result.totalRecipients).toBe(2);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockRepo.markSent).toHaveBeenCalled();
    });

    it('throws HttpException when message not found', async () => {
      mockRepo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Message not found')),
      );
      await expect(service.send('bad-id')).rejects.toBeInstanceOf(HttpException);
    });
  });

  // ---------------------------------------------------------------------------
  // handleDlr
  // ---------------------------------------------------------------------------
  describe('handleDlr', () => {
    it('updates delivery status to DELIVERED when status is "delivered"', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(
        Either.right(mockDelivery),
      );
      mockDeliveryRepo.updateStatus.mockResolvedValue(
        Either.right({ ...mockDelivery, status: DeliveryStatus.DELIVERED }),
      );

      await expect(
        service.handleDlr('uwazii-ref-1', 'delivered', new Date()),
      ).resolves.toBeUndefined();

      expect(mockDeliveryRepo.updateStatus).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({ status: DeliveryStatus.DELIVERED }),
      );
    });

    it('updates delivery status to FAILED when status is "failed"', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(
        Either.right(mockDelivery),
      );
      mockDeliveryRepo.updateStatus.mockResolvedValue(
        Either.right({ ...mockDelivery, status: DeliveryStatus.FAILED }),
      );

      await expect(
        service.handleDlr('uwazii-ref-1', 'failed'),
      ).resolves.toBeUndefined();

      expect(mockDeliveryRepo.updateStatus).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({ status: DeliveryStatus.FAILED }),
      );
    });

    it('logs warning and does not throw or call updateStatus when ref is unknown', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(Either.right(null));

      await expect(
        service.handleDlr('unknown-ref', 'delivered'),
      ).resolves.toBeUndefined();

      expect(mockDeliveryRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('delivered DLR uses provided deliveredAt date', async () => {
      const deliveredAt = new Date('2026-03-01T12:00:00Z');
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(
        Either.right(mockDelivery),
      );
      mockDeliveryRepo.updateStatus.mockResolvedValue(
        Either.right({ ...mockDelivery, status: DeliveryStatus.DELIVERED }),
      );

      await service.handleDlr('uwazii-ref-1', 'delivered', deliveredAt);

      expect(mockDeliveryRepo.updateStatus).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({ deliveredAt }),
      );
    });

    it('throws HttpException when findByUwaziRef returns an error', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB failure')),
      );
      await expect(
        service.handleDlr('ref', 'delivered'),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  // ---------------------------------------------------------------------------
  // getDeliveries
  // ---------------------------------------------------------------------------
  describe('getDeliveries', () => {
    it('returns deliveries for a message', async () => {
      mockDeliveryRepo.findByMessage.mockResolvedValue(
        Either.right([mockDelivery]),
      );
      const result = await service.getDeliveries('msg-uuid');
      expect(result).toHaveLength(1);
    });

    it('throws HttpException on repository error', async () => {
      mockDeliveryRepo.findByMessage.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );
      await expect(service.getDeliveries('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getDeliveryStats
  // ---------------------------------------------------------------------------
  describe('getDeliveryStats', () => {
    it('returns stats', async () => {
      mockDeliveryRepo.getStats.mockResolvedValue(
        Either.right({
          total: 10,
          pending: 2,
          sent: 5,
          delivered: 2,
          failed: 1,
        }),
      );
      const result = await service.getDeliveryStats('msg-uuid');
      expect(result.total).toBe(10);
      expect(result.sent).toBe(5);
      expect(result.failed).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('deletes message without error', async () => {
      mockRepo.delete.mockResolvedValue(Either.right(undefined));
      await expect(service.delete('msg-uuid')).resolves.toBeUndefined();
    });

    it('throws HttpException when delete fails', async () => {
      mockRepo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      await expect(service.delete('bad-id')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });
});
