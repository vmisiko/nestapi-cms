import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItemEntity } from './inventory-item.entity';
import type {
  IInventoryItemRepository,
  CreateItemData,
  UpdateItemData,
} from '../domain/i-inventory-item.repository';
import type { InventoryItem } from '../domain/inventory-item';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class InventoryItemRepository implements IInventoryItemRepository {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly orm: Repository<InventoryItemEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, InventoryItem[]>> {
    try {
      const entities = await this.orm.find({ order: { name: 'ASC' } });
      return Either.right(entities.map(this.toItem));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch inventory items'),
      );
    }
  }

  async findByCategoryId(
    categoryId: string,
  ): Promise<Either<DataError, InventoryItem[]>> {
    try {
      const entities = await this.orm.find({
        where: { categoryId },
        order: { name: 'ASC' },
      });
      return Either.right(entities.map(this.toItem));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch items by category'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, InventoryItem>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(
          DataError.notFound(`Inventory item ${id} not found`),
        );
      return Either.right(this.toItem(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch inventory item'),
      );
    }
  }

  async create(
    data: CreateItemData,
  ): Promise<Either<DataError, InventoryItem>> {
    try {
      const totalQty = data.totalQty ?? 0;
      const entity = this.orm.create({
        name: data.name,
        code: data.code,
        categoryId: data.categoryId,
        totalQty,
        availableQty: totalQty,
        condition: data.condition ?? null,
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toItem(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create inventory item'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateItemData,
  ): Promise<Either<DataError, InventoryItem>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update inventory item'),
      );
    }
  }

  async adjustStock(
    id: string,
    adjustment: number,
  ): Promise<Either<DataError, InventoryItem>> {
    try {
      await this.orm
        .createQueryBuilder()
        .update(InventoryItemEntity)
        .set({ availableQty: () => `available_qty + ${adjustment}` })
        .where('id = :id', { id })
        .execute();
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to adjust stock'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(
          DataError.notFound(`Inventory item ${id} not found`),
        );
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete inventory item'),
      );
    }
  }

  private toItem = (e: InventoryItemEntity): InventoryItem => ({
    id: e.id,
    name: e.name,
    code: e.code,
    categoryId: e.categoryId,
    totalQty: e.totalQty,
    availableQty: e.availableQty,
    condition: e.condition,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
