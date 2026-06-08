import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { TargetGroupResolverService } from '../target-group-resolver.service';
import { MemberEntity } from '../../../members/infrastructure/member.entity';
import { FellowshipEntity } from '../../../fellowships/infrastructure/fellowship.entity';
import { MessageTargetGroup } from '../../domain/message';
import { ActivityStatus } from '../../../core/domain/enums';
import { MemberStatus, MemberType } from '../../../members/domain/member';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal MemberEntity for testing.
 * Uses Object.assign so explicit `null` overrides are preserved
 * (unlike the `?? default` pattern that would swallow `null`).
 */
function makeMemberEntity(overrides: Partial<MemberEntity> = {}): MemberEntity {
  const defaults: Partial<MemberEntity> = {
    id: 'mem-uuid-1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '0712345678',
    email: null,
    status: MemberStatus.MEMBER,
    fellowshipId: null,
    memberType: MemberType.ADULT,
    activityStatus: ActivityStatus.ACTIVE,
    joinedAt: '2026-01-01',
    avatarUrl: null,
    departments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return Object.assign(new MemberEntity(), defaults, overrides);
}

/** Build a minimal FellowshipEntity for testing */
function makeFellowshipEntity(
  overrides: Partial<FellowshipEntity> = {},
): FellowshipEntity {
  const defaults: Partial<FellowshipEntity> = {
    id: 'fellowship-uuid-1',
    zoneId: 'zone-uuid-1',
  };
  return Object.assign(new FellowshipEntity(), defaults, overrides);
}

// ---------------------------------------------------------------------------
// QueryBuilder mock factory
// ---------------------------------------------------------------------------

function makeQueryBuilderMock(
  returnValue: MemberEntity[],
): jest.Mocked<SelectQueryBuilder<MemberEntity>> {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnValue),
  } as unknown as jest.Mocked<SelectQueryBuilder<MemberEntity>>;
  return qb;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TargetGroupResolverService', () => {
  let service: TargetGroupResolverService;
  let memberOrm: { createQueryBuilder: jest.Mock; find: jest.Mock };
  let fellowshipOrm: { find: jest.Mock };

  beforeEach(async () => {
    memberOrm = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    fellowshipOrm = {
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TargetGroupResolverService,
        {
          provide: getRepositoryToken(MemberEntity),
          useValue: memberOrm,
        },
        {
          provide: getRepositoryToken(FellowshipEntity),
          useValue: fellowshipOrm,
        },
      ],
    }).compile();

    service = module.get(TargetGroupResolverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // ALL group
  // -------------------------------------------------------------------------
  describe('ALL group', () => {
    it('returns all active members with valid phones', async () => {
      const members = [
        makeMemberEntity({ id: 'mem-1', phone: '0712345678' }),
        makeMemberEntity({ id: 'mem-2', phone: '0700000002' }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result).toHaveLength(2);
      expect(result[0].memberId).toBe('mem-1');
      expect(result[1].memberId).toBe('mem-2');
      expect(qb.getMany).toHaveBeenCalled();
      // The ALL case must NOT add a fellowship/department/zone filter
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringMatching(/fellowship_id|departments|fellowshipIds/),
        expect.anything(),
      );
    });

    it('normalises 0XXXXXXXXX format to 254XXXXXXXXX', async () => {
      const members = [makeMemberEntity({ phone: '0712345678' })];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result[0].phone).toBe('254712345678');
    });

    it('skips members with invalid phone numbers', async () => {
      const members = [
        makeMemberEntity({ id: 'valid', phone: '0712345678' }),
        makeMemberEntity({ id: 'invalid', phone: '12345' }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('valid');
    });

    it('skips members with null phones — toRecipients guard', async () => {
      // phone: null must survive the Object.assign without being replaced by default
      const members = [
        makeMemberEntity({ id: 'has-phone', phone: '0712345678' }),
        makeMemberEntity({ id: 'no-phone', phone: null as unknown as string }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('has-phone');
    });

    it('returns empty array when no active members found', async () => {
      const qb = makeQueryBuilderMock([]);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // FELLOWSHIP group
  // -------------------------------------------------------------------------
  describe('FELLOWSHIP group', () => {
    it('returns only members belonging to the specified fellowship', async () => {
      const members = [
        makeMemberEntity({
          id: 'mem-1',
          phone: '254712345678',
          fellowshipId: 'fellowship-1',
        }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(
        MessageTargetGroup.FELLOWSHIP,
        'fellowship-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('mem-1');
      expect(qb.andWhere).toHaveBeenCalledWith('m.fellowship_id = :id', {
        id: 'fellowship-1',
      });
    });

    it('returns empty array when targetId is null — getMany never called', async () => {
      // createQueryBuilder IS called (base QB built before the switch),
      // but getMany should NOT be called because the switch returns [] early.
      const qb = makeQueryBuilderMock([]);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.FELLOWSHIP, null);

      expect(result).toHaveLength(0);
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // DEPARTMENT group
  // -------------------------------------------------------------------------
  describe('DEPARTMENT group', () => {
    it('returns only members in the specified department', async () => {
      const members = [
        makeMemberEntity({ id: 'mem-dept', phone: '254700000001' }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(
        MessageTargetGroup.DEPARTMENT,
        'dept-uuid-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('mem-dept');
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'member_departments',
        'md',
        'md.member_id = m.id AND md.department_id = :deptId',
        { deptId: 'dept-uuid-1' },
      );
    });

    it('returns empty array when targetId is null — getMany never called', async () => {
      const qb = makeQueryBuilderMock([]);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.DEPARTMENT, null);

      expect(result).toHaveLength(0);
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // ZONE group
  // -------------------------------------------------------------------------
  describe('ZONE group', () => {
    it('returns members across all fellowships in the specified zone', async () => {
      fellowshipOrm.find.mockResolvedValue([
        makeFellowshipEntity({ id: 'fell-1', zoneId: 'zone-1' }),
        makeFellowshipEntity({ id: 'fell-2', zoneId: 'zone-1' }),
      ]);
      const members = [
        makeMemberEntity({
          id: 'mem-zone-1',
          phone: '254700000001',
          fellowshipId: 'fell-1',
        }),
        makeMemberEntity({
          id: 'mem-zone-2',
          phone: '254700000002',
          fellowshipId: 'fell-2',
        }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ZONE, 'zone-1');

      expect(result).toHaveLength(2);
      expect(fellowshipOrm.find).toHaveBeenCalledWith({
        where: { zoneId: 'zone-1' },
        select: ['id'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'm.fellowship_id IN (:...fellowshipIds)',
        { fellowshipIds: ['fell-1', 'fell-2'] },
      );
    });

    it('returns empty array when no fellowships found in zone — getMany never called', async () => {
      fellowshipOrm.find.mockResolvedValue([]);
      const qb = makeQueryBuilderMock([]);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(
        MessageTargetGroup.ZONE,
        'zone-no-fellowships',
      );

      expect(result).toHaveLength(0);
      expect(qb.getMany).not.toHaveBeenCalled();
    });

    it('returns empty array when targetId is null — fellowshipOrm.find never called', async () => {
      const qb = makeQueryBuilderMock([]);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ZONE, null);

      expect(result).toHaveLength(0);
      expect(fellowshipOrm.find).not.toHaveBeenCalled();
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Phone normalisation (delegates to UwaziiProvider.normalizePhone)
  // -------------------------------------------------------------------------
  describe('phone normalisation', () => {
    it('normalises 0XXXXXXXXX (10 digits) format', async () => {
      const members = [makeMemberEntity({ phone: '0712345678' })];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result[0].phone).toBe('254712345678');
    });

    it('normalises 7XXXXXXXX / 1XXXXXXXX (9 digits) format', async () => {
      const members = [makeMemberEntity({ phone: '712345678' })];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result[0].phone).toBe('254712345678');
    });

    it('leaves 254XXXXXXXXXX (12 digits) format unchanged', async () => {
      const members = [makeMemberEntity({ phone: '254712345678' })];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result[0].phone).toBe('254712345678');
    });

    it('skips members with invalid phone numbers', async () => {
      const members = [makeMemberEntity({ id: 'bad-phone', phone: '999' })];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // recipient mapping
  // -------------------------------------------------------------------------
  describe('recipient mapping', () => {
    it('sets memberName to "firstName lastName"', async () => {
      const members = [
        makeMemberEntity({
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '254700000001',
        }),
      ];
      const qb = makeQueryBuilderMock(members);
      memberOrm.createQueryBuilder.mockReturnValue(qb);

      const result = await service.resolve(MessageTargetGroup.ALL, null);

      expect(result[0].memberName).toBe('Jane Smith');
    });
  });
});
