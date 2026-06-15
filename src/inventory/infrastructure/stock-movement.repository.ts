import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMovementEntity } from './stock-movement.entity';
import type {
  IStockMovementRepository,
  CreateStockMovementData,
} from '../domain/i-stock-movement.repository';
import type { StockMovement } from '../domain/stock-movement';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class StockMovementRepository implements IStockMovementRepository {
  constructor(
    @InjectRepository(StockMovementEntity)
    private readonly orm: Repository<StockMovementEntity>,
  ) {}

  async findAll(limit = 50): Promise<Either<DataError, StockMovement[]>> {
    try {
      const entities = await this.orm.find({
        order: { createdAt: 'DESC' },
        take: limit,
      });
      return Either.right(entities.map(this.toMovement));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch stock movements'),
      );
    }
  }

  async create(
    data: CreateStockMovementData,
  ): Promise<Either<DataError, StockMovement>> {
    try {
      const entity = this.orm.create({
        itemId: data.itemId,
        itemName: data.itemName,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason ?? null,
        performedBy: data.performedBy,
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toMovement(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create stock movement'),
      );
    }
  }

  private toMovement = (e: StockMovementEntity): StockMovement => ({
    id: e.id,
    itemId: e.itemId,
    itemName: e.itemName,
    type: e.type,
    quantity: e.quantity,
    reason: e.reason,
    performedBy: e.performedBy,
    createdAt: e.createdAt,
  });
}
