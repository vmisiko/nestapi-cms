import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemRequestEntity } from './item-request.entity';
import type {
  IItemRequestRepository,
  CreateItemRequestData,
} from '../domain/i-item-request.repository';
import type { ItemRequest, ItemRequestStatus } from '../domain/item-request';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class ItemRequestRepository implements IItemRequestRepository {
  constructor(
    @InjectRepository(ItemRequestEntity)
    private readonly orm: Repository<ItemRequestEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, ItemRequest[]>> {
    try {
      const entities = await this.orm.find({ order: { createdAt: 'DESC' } });
      return Either.right(entities.map(this.toRequest));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch item requests'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, ItemRequest>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Item request ${id} not found`));
      return Either.right(this.toRequest(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch item request'),
      );
    }
  }

  async create(
    data: CreateItemRequestData,
  ): Promise<Either<DataError, ItemRequest>> {
    try {
      const entity = this.orm.create({
        requester: data.requester,
        requesterAvatar: data.requesterAvatar,
        itemId: data.itemId,
        itemName: data.itemName,
        quantity: data.quantity,
        reason: data.reason ?? null,
        requestDate: data.requestDate,
        returnDate: data.returnDate,
        status: 'pending',
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toRequest(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create item request'),
      );
    }
  }

  async updateStatus(
    id: string,
    status: ItemRequestStatus,
  ): Promise<Either<DataError, ItemRequest>> {
    try {
      await this.orm.update(id, { status });
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update item request status'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Item request ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete item request'),
      );
    }
  }

  private toRequest = (e: ItemRequestEntity): ItemRequest => ({
    id: e.id,
    requester: e.requester,
    requesterAvatar: e.requesterAvatar,
    itemId: e.itemId,
    itemName: e.itemName,
    quantity: e.quantity,
    reason: e.reason,
    requestDate: e.requestDate,
    returnDate: e.returnDate,
    status: e.status,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
