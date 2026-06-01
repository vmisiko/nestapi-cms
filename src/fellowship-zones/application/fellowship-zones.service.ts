import { Injectable } from '@nestjs/common';
import { FellowshipZoneRepository } from '../infrastructure/fellowship-zone.repository';
import { GetFellowshipZonesUseCase } from '../domain/usecases/get-fellowship-zones.usecase';
import { GetFellowshipZoneByIdUseCase } from '../domain/usecases/get-fellowship-zone-by-id.usecase';
import { CreateFellowshipZoneUseCase } from '../domain/usecases/create-fellowship-zone.usecase';
import { UpdateFellowshipZoneUseCase } from '../domain/usecases/update-fellowship-zone.usecase';
import { DeleteFellowshipZoneUseCase } from '../domain/usecases/delete-fellowship-zone.usecase';
import type { CreateFellowshipZoneDto } from '../presentation/dto/create-fellowship-zone.dto';
import type { UpdateFellowshipZoneDto } from '../presentation/dto/update-fellowship-zone.dto';
import type { FellowshipZone } from '../domain/fellowship-zone';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class FellowshipZonesService {
  private readonly getAll: GetFellowshipZonesUseCase;
  private readonly getById: GetFellowshipZoneByIdUseCase;
  private readonly createUseCase: CreateFellowshipZoneUseCase;
  private readonly updateUseCase: UpdateFellowshipZoneUseCase;
  private readonly deleteUseCase: DeleteFellowshipZoneUseCase;

  constructor(readonly repo: FellowshipZoneRepository) {
    this.getAll = new GetFellowshipZonesUseCase(repo);
    this.getById = new GetFellowshipZoneByIdUseCase(repo);
    this.createUseCase = new CreateFellowshipZoneUseCase(repo);
    this.updateUseCase = new UpdateFellowshipZoneUseCase(repo);
    this.deleteUseCase = new DeleteFellowshipZoneUseCase(repo);
  }

  async findAll(): Promise<FellowshipZone[]> {
    const result = await this.getAll.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (zones) => zones,
    );
  }

  async findById(id: string): Promise<FellowshipZone> {
    const result = await this.getById.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (zone) => zone,
    );
  }

  async create(dto: CreateFellowshipZoneDto): Promise<FellowshipZone> {
    const result = await this.createUseCase.execute(dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (zone) => zone,
    );
  }

  async update(
    id: string,
    dto: UpdateFellowshipZoneDto,
  ): Promise<FellowshipZone> {
    const result = await this.updateUseCase.execute(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (zone) => zone,
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
