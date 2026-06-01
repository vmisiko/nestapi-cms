import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { CreateMessageUseCase } from '../create-message.usecase';
import { GetMessagesUseCase } from '../get-messages.usecase';
import { GetMessageByIdUseCase } from '../get-message-by-id.usecase';
import { UpdateMessageUseCase } from '../update-message.usecase';
import { DeleteMessageUseCase } from '../delete-message.usecase';
import { SendMessageUseCase } from '../send-message.usecase';
import type { IMessageRepository } from '../../i-message.repository';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
  type Message,
} from '../../message';

const mockMessage: Message = {
  id: 'msg-uuid',
  title: 'Test Announcement',
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

describe('Messaging Use Cases', () => {
  let repo: jest.Mocked<IMessageRepository>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      markSent: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('GetMessagesUseCase', () => {
    it('returns all messages', async () => {
      repo.findAll.mockResolvedValue(Either.right([mockMessage]));
      const result = await new GetMessagesUseCase(repo).execute();
      expect(result.isRight()).toBe(true);
      expect(result.getOrElse([])).toHaveLength(1);
    });
  });

  describe('GetMessageByIdUseCase', () => {
    it('returns message when found', async () => {
      repo.findById.mockResolvedValue(Either.right(mockMessage));
      const result = await new GetMessageByIdUseCase(repo).execute('msg-uuid');
      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when missing', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      const result = await new GetMessageByIdUseCase(repo).execute('bad');
      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NotFoundError');
    });
  });

  describe('CreateMessageUseCase', () => {
    it('creates message', async () => {
      repo.create.mockResolvedValue(Either.right(mockMessage));
      const result = await new CreateMessageUseCase(repo).execute({
        title: 'Test',
        body: 'Body',
        type: MessageType.ANNOUNCEMENT,
        targetGroup: MessageTargetGroup.ALL,
        createdBy: 'user-uuid',
      });
      expect(result.isRight()).toBe(true);
    });
  });

  describe('UpdateMessageUseCase', () => {
    it('updates message', async () => {
      repo.update.mockResolvedValue(
        Either.right({ ...mockMessage, title: 'Updated' }),
      );
      const result = await new UpdateMessageUseCase(repo).execute('msg-uuid', {
        title: 'Updated',
      });
      expect(result.isRight()).toBe(true);
    });
  });

  describe('DeleteMessageUseCase', () => {
    it('deletes message', async () => {
      repo.delete.mockResolvedValue(Either.right(undefined));
      const result = await new DeleteMessageUseCase(repo).execute('msg-uuid');
      expect(result.isRight()).toBe(true);
    });
  });

  describe('SendMessageUseCase', () => {
    it('sends a draft message', async () => {
      repo.findById.mockResolvedValue(Either.right(mockMessage));
      repo.markSent.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      const result = await new SendMessageUseCase(repo).execute('msg-uuid');
      expect(result.isRight()).toBe(true);
      expect(repo.markSent).toHaveBeenCalled();
    });

    it('returns BusinessRuleError when already sent', async () => {
      repo.findById.mockResolvedValue(
        Either.right({ ...mockMessage, status: MessageStatus.SENT }),
      );
      const result = await new SendMessageUseCase(repo).execute('msg-uuid');
      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('BusinessRuleError');
    });

    it('returns error when message not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      const result = await new SendMessageUseCase(repo).execute('bad');
      expect(result.isLeft()).toBe(true);
    });
  });
});
