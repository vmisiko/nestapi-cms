import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MilestonesService } from '../milestones.service';
import { MilestoneTypeRepository } from '../../infrastructure/milestone-type.repository';
import { MemberMilestoneRepository } from '../../infrastructure/member-milestone.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';

const DATE = new Date('2026-01-01T00:00:00Z');
const TYPE_ID = '00000000-0000-4000-8000-000000000010';
const MEMBER_ID = '00000000-0000-4000-8000-000000000001';
const MILESTONE_ID = '00000000-0000-4000-8000-000000000020';

const makeType = (overrides = {}) => ({
  id: TYPE_ID,
  name: 'Baptism',
  description: 'Water baptism',
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

const makeMilestone = (overrides = {}) => ({
  id: MILESTONE_ID,
  memberId: MEMBER_ID,
  milestoneTypeId: TYPE_ID,
  achievedAt: '2026-06-01',
  notes: null,
  createdAt: DATE,
  ...overrides,
});

const mockTypeRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const mockMemberMilestoneRepo = () => ({
  findByMember: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

describe('MilestonesService', () => {
  let service: MilestonesService;
  let typeRepo: ReturnType<typeof mockTypeRepo>;
  let memberMilestoneRepo: ReturnType<typeof mockMemberMilestoneRepo>;

  beforeEach(async () => {
    typeRepo = mockTypeRepo();
    memberMilestoneRepo = mockMemberMilestoneRepo();

    const module = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: MilestoneTypeRepository, useValue: typeRepo },
        { provide: MemberMilestoneRepository, useValue: memberMilestoneRepo },
      ],
    }).compile();

    service = module.get(MilestonesService);
  });

  describe('findAllTypes', () => {
    it('returns milestone types', async () => {
      typeRepo.findAll.mockResolvedValue(Either.right([makeType()]));

      const result = await service.findAllTypes();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Baptism');
    });

    it('throws on repository error', async () => {
      typeRepo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.findAllTypes()).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('createType', () => {
    it('creates a milestone type', async () => {
      typeRepo.create.mockResolvedValue(Either.right(makeType()));

      const result = await service.createType({ name: 'Baptism' });

      expect(result.name).toBe('Baptism');
    });
  });

  describe('deleteType', () => {
    it('throws a conflict when the type is still referenced', async () => {
      typeRepo.delete.mockResolvedValue(
        Either.left(
          DataError.conflict(
            'Cannot delete a milestone type that has been recorded against members',
          ),
        ),
      );

      await expect(service.deleteType(TYPE_ID)).rejects.toThrow(
        new HttpException(
          'Cannot delete a milestone type that has been recorded against members',
          HttpStatus.CONFLICT,
        ),
      );
    });
  });

  describe('findByMember', () => {
    it('returns a member\'s milestones', async () => {
      memberMilestoneRepo.findByMember.mockResolvedValue(
        Either.right([makeMilestone()]),
      );

      const result = await service.findByMember(MEMBER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].milestoneTypeId).toBe(TYPE_ID);
    });
  });

  describe('recordMilestone', () => {
    it('records a milestone for a member', async () => {
      memberMilestoneRepo.create.mockResolvedValue(
        Either.right(makeMilestone()),
      );

      const result = await service.recordMilestone(MEMBER_ID, {
        milestoneTypeId: TYPE_ID,
      });

      expect(memberMilestoneRepo.create).toHaveBeenCalledWith({
        memberId: MEMBER_ID,
        milestoneTypeId: TYPE_ID,
        achievedAt: undefined,
        notes: undefined,
      });
      expect(result.memberId).toBe(MEMBER_ID);
    });
  });

  describe('deleteMilestone', () => {
    it('throws 404 when the milestone does not exist', async () => {
      memberMilestoneRepo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Milestone not found')),
      );

      await expect(service.deleteMilestone(MILESTONE_ID)).rejects.toThrow(
        new HttpException('Milestone not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
