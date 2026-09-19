import { ScheduledMessageDispatchService } from '../scheduled-message-dispatch.service';
import { AutomationRunLogService } from '../automation-run-log.service';

describe('ScheduledMessageDispatchService', () => {
  it('sends every due draft message and reports how many succeeded', async () => {
    const due = [{ id: 'msg-1' }, { id: 'msg-2' }];
    const messageOrm = { find: jest.fn().mockResolvedValue(due) };
    const messagingService = { send: jest.fn().mockResolvedValue({ sent: 1 }) };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);

    const service = new ScheduledMessageDispatchService(
      messageOrm as never,
      messagingService as never,
      runLog,
    );

    await service.runDispatch();

    expect(messagingService.send).toHaveBeenCalledWith('msg-1');
    expect(messagingService.send).toHaveBeenCalledWith('msg-2');
  });

  it('continues dispatching remaining messages if one send fails', async () => {
    const due = [{ id: 'msg-1' }, { id: 'msg-2' }];
    const messageOrm = { find: jest.fn().mockResolvedValue(due) };
    const messagingService = {
      send: jest
        .fn()
        .mockRejectedValueOnce(new Error('no recipients'))
        .mockResolvedValueOnce({ sent: 1 }),
    };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);

    const service = new ScheduledMessageDispatchService(
      messageOrm as never,
      messagingService as never,
      runLog,
    );

    await expect(service.runDispatch()).resolves.toBeUndefined();
    expect(messagingService.send).toHaveBeenCalledTimes(2);
  });
});
