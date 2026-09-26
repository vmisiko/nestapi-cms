import { Injectable } from '@nestjs/common';
import { CareRecordRepository } from '../infrastructure/care-record.repository';
import type { CareRecord } from '../domain/care-record';
import type { CreateCareRecordDto } from '../presentation/dto/create-care-record.dto';
import type { UpdateCareRecordDto } from '../presentation/dto/update-care-record.dto';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class CareService {
  constructor(private readonly repo: CareRecordRepository) {}

  async findByMember(memberId: string): Promise<CareRecord[]> {
    const result = await this.repo.findByMember(memberId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (records) => records,
    );
  }

  async create(
    memberId: string,
    dto: CreateCareRecordDto,
    handledBy?: string,
  ): Promise<CareRecord> {
    const result = await this.repo.create({
      memberId,
      type: dto.type,
      notes: dto.notes,
      handledBy: handledBy ?? null,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (record) => record,
    );
  }

  async update(id: string, dto: UpdateCareRecordDto): Promise<CareRecord> {
    const result = await this.repo.update(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (record) => record,
    );
  }
}
