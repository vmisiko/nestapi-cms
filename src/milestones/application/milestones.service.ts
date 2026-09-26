import { Injectable } from '@nestjs/common';
import { MilestoneTypeRepository } from '../infrastructure/milestone-type.repository';
import { MemberMilestoneRepository } from '../infrastructure/member-milestone.repository';
import type { MilestoneType, MemberMilestone } from '../domain/milestone-type';
import type { CreateMilestoneTypeDto } from '../presentation/dto/create-milestone-type.dto';
import type { UpdateMilestoneTypeDto } from '../presentation/dto/update-milestone-type.dto';
import type { RecordMemberMilestoneDto } from '../presentation/dto/record-member-milestone.dto';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly typeRepo: MilestoneTypeRepository,
    private readonly memberMilestoneRepo: MemberMilestoneRepository,
  ) {}

  async findAllTypes(): Promise<MilestoneType[]> {
    const result = await this.typeRepo.findAll();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (types) => types,
    );
  }

  async createType(dto: CreateMilestoneTypeDto): Promise<MilestoneType> {
    const result = await this.typeRepo.create(dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (type) => type,
    );
  }

  async updateType(
    id: string,
    dto: UpdateMilestoneTypeDto,
  ): Promise<MilestoneType> {
    const result = await this.typeRepo.update(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (type) => type,
    );
  }

  async deleteType(id: string): Promise<void> {
    const result = await this.typeRepo.delete(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async findByMember(memberId: string): Promise<MemberMilestone[]> {
    const result = await this.memberMilestoneRepo.findByMember(memberId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (milestones) => milestones,
    );
  }

  async recordMilestone(
    memberId: string,
    dto: RecordMemberMilestoneDto,
  ): Promise<MemberMilestone> {
    const result = await this.memberMilestoneRepo.create({
      memberId,
      milestoneTypeId: dto.milestoneTypeId,
      achievedAt: dto.achievedAt,
      notes: dto.notes,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (milestone) => milestone,
    );
  }

  async deleteMilestone(id: string): Promise<void> {
    const result = await this.memberMilestoneRepo.delete(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
