import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageRepository } from '../message.repository';
import { MessageEntity } from '../message.entity';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
} from '../../domain/message';

const msgEntity: MessageEntity = {
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

describe('MessageRepository', () => {
  let repo: MessageRepository;
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
        MessageRepository,
        { provide: getRepositoryToken(MessageEntity), useValue: ormMock },
      ],
    }).compile();
    repo = module.get(MessageRepository);
  });

  it('findAll returns right with messages', async () => {
    ormMock.find.mockResolvedValue([msgEntity]);
    const result = await repo.findAll();
    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(1);
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

  it('findById returns right when found', async () => {
    ormMock.findOne.mockResolvedValue(msgEntity);
    const result = await repo.findById('msg-uuid');
    expect(result.isRight()).toBe(true);
  });

  it('create saves and returns message', async () => {
    ormMock.create.mockReturnValue(msgEntity);
    ormMock.save.mockResolvedValue(msgEntity);
    const result = await repo.create({
      title: 'Announcement',
      body: 'Body text',
      type: MessageType.ANNOUNCEMENT,
      targetGroup: MessageTargetGroup.ALL,
      createdBy: 'user-uuid',
    });
    expect(result.isRight()).toBe(true);
  });

  it('markSent updates status and sets sentAt', async () => {
    ormMock.update.mockResolvedValue({ affected: 1 });
    ormMock.findOne.mockResolvedValue({
      ...msgEntity,
      status: MessageStatus.SENT,
      sentAt: new Date(),
    });
    const result = await repo.markSent('msg-uuid', new Date());
    expect(result.isRight()).toBe(true);
  });

  it('delete returns NotFoundError when affected is 0', async () => {
    ormMock.delete.mockResolvedValue({ affected: 0 });
    const result = await repo.delete('missing');
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('findAll returns NetworkError when orm throws', async () => {
    ormMock.find.mockRejectedValue(new Error('DB down'));
    const result = await repo.findAll();
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
