import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import { MessageTargetGroup } from '../domain/message';
import { ActivityStatus } from '../../core/domain/enums';
import { UwaziiProvider } from '../infrastructure/uwazii.provider';

export interface MessageRecipient {
  memberId: string;
  memberName: string;
  phone: string;
}

@Injectable()
export class TargetGroupResolverService {
  private readonly logger = new Logger(TargetGroupResolverService.name);

  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
    @InjectRepository(FellowshipEntity)
    private readonly fellowshipOrm: Repository<FellowshipEntity>,
  ) {}

  /**
   * Resolve a target group to a list of recipients with valid phone numbers.
   * Only active members are included. Phones are normalised to Uwazii format.
   */
  async resolve(
    targetGroup: MessageTargetGroup,
    targetId: string | null,
    memberIds?: string[],
  ): Promise<MessageRecipient[]> {
    const members = await this.fetchMembers(targetGroup, targetId, memberIds);
    return this.toRecipients(members);
  }

  private async fetchMembers(
    targetGroup: MessageTargetGroup,
    targetId: string | null,
    memberIds?: string[],
  ): Promise<MemberEntity[]> {
    const base = this.memberOrm
      .createQueryBuilder('m')
      .where('m.activity_status = :status', { status: ActivityStatus.ACTIVE })
      .andWhere('m.phone IS NOT NULL');

    switch (targetGroup) {
      case MessageTargetGroup.ALL:
        return base.getMany();

      case MessageTargetGroup.FELLOWSHIP:
        if (!targetId) return [];
        return base
          .andWhere('m.fellowship_id = :id', { id: targetId })
          .getMany();

      case MessageTargetGroup.DEPARTMENT:
        if (!targetId) return [];
        return base
          .innerJoin(
            'member_departments',
            'md',
            'md.member_id = m.id AND md.department_id = :deptId',
            { deptId: targetId },
          )
          .getMany();

      case MessageTargetGroup.ZONE: {
        if (!targetId) return [];
        const fellowships = await this.fellowshipOrm.find({
          where: { zoneId: targetId },
          select: ['id'],
        });
        if (fellowships.length === 0) return [];
        const fellowshipIds = fellowships.map((f) => f.id);
        return base
          .andWhere('m.fellowship_id IN (:...fellowshipIds)', { fellowshipIds })
          .getMany();
      }

      case MessageTargetGroup.MEMBERS:
        if (!memberIds || memberIds.length === 0) return [];
        return base
          .andWhere('m.id IN (:...memberIds)', { memberIds })
          .getMany();

      default:
        this.logger.warn(`Unknown target group: ${String(targetGroup)}`);
        return [];
    }
  }

  private toRecipients(members: MemberEntity[]): MessageRecipient[] {
    const recipients: MessageRecipient[] = [];
    for (const m of members) {
      if (!m.phone) continue;
      const phone = UwaziiProvider.normalizePhone(m.phone);
      if (!phone) {
        this.logger.warn(`Skipping member ${m.id} — invalid phone: ${m.phone}`);
        continue;
      }
      recipients.push({
        memberId: m.id,
        memberName: `${m.firstName} ${m.lastName}`,
        phone,
      });
    }
    return recipients;
  }
}
