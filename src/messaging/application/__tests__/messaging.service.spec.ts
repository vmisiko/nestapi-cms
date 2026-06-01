import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { MessageRepository } from '../../infrastructure/message.repository';
import { MessageDeliveryRepository } from '../../infrastructure/message-delivery.repository';
import { UwaziiProvider } from '../../infrastructure/uwazii.provider';
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
        { provide: UwaziiProvider, useValue: mockUwazii },
        { provide: TargetGroupResolverService, useValue: mockResolver },
      ],
    }).compile();
    service = module.get(MessagingService);
  });

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

  describe('send', () => {
    it('resolves recipients, dispatches to Uwazii, returns summary', async () => {
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
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.totalRecipients).toBe(1);
    });

    it('throws 422 when already sent', async () => {
      mockRepo.findById.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      await expect(service.send('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('throws 422 when no recipients found', async () => {
      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      mockResolver.resolve.mockResolvedValue([]);
      await expect(service.send('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('handleDlr', () => {
    it('updates delivery status to delivered', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(
        Either.right(mockDelivery),
      );
      mockDeliveryRepo.updateStatus.mockResolvedValue(
        Either.right({ ...mockDelivery, status: DeliveryStatus.DELIVERED }),
      );
      await expect(
        service.handleDlr('uwazii-ref-1', 'delivered'),
      ).resolves.toBeUndefined();
      expect(mockDeliveryRepo.updateStatus).toHaveBeenCalled();
    });

    it('silently ignores unknown ref', async () => {
      mockDeliveryRepo.findByUwaziRef.mockResolvedValue(Either.right(null));
      await expect(
        service.handleDlr('unknown-ref', 'delivered'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getDeliveries', () => {
    it('returns deliveries for a message', async () => {
      mockDeliveryRepo.findByMessage.mockResolvedValue(
        Either.right([mockDelivery]),
      );
      const result = await service.getDeliveries('msg-uuid');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDeliveryStats', () => {
    it('returns stats', async () => {
      mockDeliveryRepo.getStats.mockResolvedValue(
        Either.right({
          total: 1,
          pending: 0,
          sent: 1,
          delivered: 0,
          failed: 0,
        }),
      );
      const result = await service.getDeliveryStats('msg-uuid');
      expect(result.total).toBe(1);
    });
  });

  describe('delete', () => {
    it('deletes message without error', async () => {
      mockRepo.delete.mockResolvedValue(Either.right(undefined));
      await expect(service.delete('msg-uuid')).resolves.toBeUndefined();
    });
  });
});
