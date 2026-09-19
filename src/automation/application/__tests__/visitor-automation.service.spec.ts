import { VisitorAutomationService } from '../visitor-automation.service';
import { AutomationRunLogService } from '../automation-run-log.service';
import { FollowUpSource } from '../../../follow-ups/domain/follow-up';
import { ChurchRole } from '../../../core/domain/enums';
import type { Member } from '../../../members/domain/member';

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-id',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    email: null,
    status: 'guest' as never,
    fellowshipId: null,
    memberType: 'adult' as never,
    activityStatus: 'active' as never,
    joinedAt: '2026-09-19',
    avatarUrl: null,
    gender: null,
    ageGroup: null,
    churchRole: null,
    isOnline: false,
    isInternational: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VisitorAutomationService', () => {
  it('creates a welcome follow-up task for a first-time visitor', async () => {
    const followUpService = {
      createAutomated: jest.fn().mockResolvedValue({ task: {}, created: true }),
    };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);
    const service = new VisitorAutomationService(
      followUpService as never,
      runLog,
    );

    await service.handleNewMember(
      makeMember({ churchRole: ChurchRole.FIRST_TIME_VISITOR }),
    );

    expect(followUpService.createAutomated).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-id',
        source: FollowUpSource.VISITOR_AUTOMATION,
      }),
    );
  });

  it('does nothing for a member who is not a first-time visitor', async () => {
    const followUpService = { createAutomated: jest.fn() };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);
    const service = new VisitorAutomationService(
      followUpService as never,
      runLog,
    );

    await service.handleNewMember(
      makeMember({ churchRole: ChurchRole.CHURCH_MEMBER }),
    );

    expect(followUpService.createAutomated).not.toHaveBeenCalled();
  });
});
