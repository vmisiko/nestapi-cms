import { Injectable } from '@nestjs/common';
import { FellowshipRepository } from '../infrastructure/fellowship.repository';
import { GetFellowshipsUseCase } from '../domain/usecases/get-fellowships.usecase';
import { GetFellowshipByIdUseCase } from '../domain/usecases/get-fellowship-by-id.usecase';
import { GetFellowshipBySlugUseCase } from '../domain/usecases/get-fellowship-by-slug.usecase';
import { CreateFellowshipUseCase } from '../domain/usecases/create-fellowship.usecase';
import { UpdateFellowshipUseCase } from '../domain/usecases/update-fellowship.usecase';
import { DeleteFellowshipUseCase } from '../domain/usecases/delete-fellowship.usecase';
import type { CreateFellowshipDto } from '../presentation/dto/create-fellowship.dto';
import type { UpdateFellowshipDto } from '../presentation/dto/update-fellowship.dto';
import type { FellowshipFiltersDto } from '../presentation/dto/fellowship-filters.dto';
import type { Fellowship } from '../domain/fellowship';
import type { FellowshipFilters } from '../domain/i-fellowship.repository';
import { toHttpException } from '../../core/application/http-exception.util';
import { ActivityStatus } from '../../core/domain/enums';

@Injectable()
export class FellowshipsService {
  private readonly getAll: GetFellowshipsUseCase;
  private readonly getById: GetFellowshipByIdUseCase;
  private readonly getBySlug: GetFellowshipBySlugUseCase;
  private readonly createUseCase: CreateFellowshipUseCase;
  private readonly updateUseCase: UpdateFellowshipUseCase;
  private readonly deleteUseCase: DeleteFellowshipUseCase;

  constructor(readonly repo: FellowshipRepository) {
    this.getAll = new GetFellowshipsUseCase(repo);
    this.getById = new GetFellowshipByIdUseCase(repo);
    this.getBySlug = new GetFellowshipBySlugUseCase(repo);
    this.createUseCase = new CreateFellowshipUseCase(repo);
    this.updateUseCase = new UpdateFellowshipUseCase(repo);
    this.deleteUseCase = new DeleteFellowshipUseCase(repo);
  }

  async findAll(query: FellowshipFiltersDto): Promise<Fellowship[]> {
    const filters: FellowshipFilters = {};
    if (query.zoneId) filters.zoneId = query.zoneId;
    if (query.status) filters.status = query.status as ActivityStatus;

    const result = await this.getAll.execute(filters);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (f) => f,
    );
  }

  async findById(id: string): Promise<Fellowship> {
    const result = await this.getById.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (f) => f,
    );
  }

  async findBySlug(slug: string): Promise<Fellowship> {
    const result = await this.getBySlug.execute(slug);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (f) => f,
    );
  }

  async create(dto: CreateFellowshipDto): Promise<Fellowship> {
    const result = await this.createUseCase.execute(dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (f) => f,
    );
  }

  async update(id: string, dto: UpdateFellowshipDto): Promise<Fellowship> {
    const result = await this.updateUseCase.execute(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (f) => f,
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
