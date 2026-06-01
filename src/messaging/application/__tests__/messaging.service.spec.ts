import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { MessageRepository } from '../../infrastructure/message.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
} from '../../domain/message';

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  markSent: jest.fn(),
  delete: jest.fn(),
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

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: MessageRepository, useValue: mockRepo },
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
    it('sends a draft message without error', async () => {
      mockRepo.findById.mockResolvedValue(Either.right(mockMessage));
      mockRepo.markSent.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      await expect(service.send('msg-uuid')).resolves.toBeUndefined();
    });

    it('throws on already sent message', async () => {
      mockRepo.findById.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      await expect(service.send('msg-uuid')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('delete', () => {
    it('deletes message without error', async () => {
      mockRepo.delete.mockResolvedValue(Either.right(undefined));
      await expect(service.delete('msg-uuid')).resolves.toBeUndefined();
    });
  });
});
