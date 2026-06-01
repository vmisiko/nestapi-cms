import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryCategoryEntity } from './inventory-category.entity';
import type {
  IInventoryCategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from '../domain/i-inventory-category.repository';
import type { InventoryCategory } from '../domain/inventory-category';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class InventoryCategoryRepository implements IInventoryCategoryRepository {
  constructor(
    @InjectRepository(InventoryCategoryEntity)
    private readonly orm: Repository<InventoryCategoryEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, InventoryCategory[]>> {
    try {
      const entities = await this.orm.find({ order: { name: 'ASC' } });
      return Either.right(entities.map(this.toCategory));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch inventory categories'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, InventoryCategory>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(
          DataError.notFound(`Inventory category ${id} not found`),
        );
      return Either.right(this.toCategory(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch inventory category'),
      );
    }
  }

  async create(
    data: CreateCategoryData,
  ): Promise<Either<DataError, InventoryCategory>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toCategory(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create inventory category'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<Either<DataError, InventoryCategory>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update inventory category'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(
          DataError.notFound(`Inventory category ${id} not found`),
        );
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete inventory category'),
      );
    }
  }

  private toCategory = (e: InventoryCategoryEntity): InventoryCategory => ({
    id: e.id,
    name: e.name,
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
