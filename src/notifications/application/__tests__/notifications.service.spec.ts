import { NotificationsService } from '../notifications.service';

describe('NotificationsService', () => {
  it('returns notifications with an unread count for a user', async () => {
    const repo = {
      findForUser: jest.fn().mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]),
      countUnread: jest.fn().mockResolvedValue(2),
    };
    const service = new NotificationsService(repo as never);

    const result = await service.findForUser('user-id');

    expect(result).toEqual({
      notifications: [{ id: 'n1' }, { id: 'n2' }],
      unreadCount: 2,
    });
  });

  it('marks a notification as read', async () => {
    const repo = {
      markRead: jest.fn().mockResolvedValue({ id: 'n1', readAt: new Date() }),
    };
    const service = new NotificationsService(repo as never);

    const result = await service.markRead('n1', 'user-id');

    expect(repo.markRead).toHaveBeenCalledWith('n1', 'user-id');
    expect(result.id).toBe('n1');
  });

  it('throws when marking a notification that does not belong to the user', async () => {
    const repo = { markRead: jest.fn().mockResolvedValue(null) };
    const service = new NotificationsService(repo as never);

    await expect(service.markRead('n1', 'user-id')).rejects.toThrow();
  });
});
