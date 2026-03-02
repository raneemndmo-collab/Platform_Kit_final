// Rasid v6.4 — Bulk Database Operations — A3 Fix
import { Repository, EntityManager, DeepPartial, ObjectLiteral } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('BulkOperations');

/**
 * A3 FIX: Replace individual saves with bulk operations
 * Original: 30 individual repo.save() calls = 30 DB round-trips
 * Fixed: Batch into chunks of configurable size = ceil(N/chunkSize) round-trips
 */
export async function bulkSave<T extends ObjectLiteral>(
  repo: Repository<T>,
  entities: DeepPartial<T>[],
  chunkSize: number = 500,
): Promise<T[]> {
  if (entities.length === 0) return [];
  if (entities.length <= chunkSize) {
    return repo.save(entities as any[]);
  }
  
  const results: T[] = [];
  for (let i = 0; i < entities.length; i += chunkSize) {
    const chunk = entities.slice(i, i + chunkSize);
    const saved = await repo.save(chunk as any[]);
    results.push(...saved);
    logger.debug(`Bulk saved chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(entities.length / chunkSize)} (${chunk.length} records)`);
  }
  return results;
}

export async function bulkInsert<T extends ObjectLiteral>(
  repo: Repository<T>,
  entities: DeepPartial<T>[],
  chunkSize: number = 1000,
): Promise<void> {
  if (entities.length === 0) return;
  for (let i = 0; i < entities.length; i += chunkSize) {
    const chunk = entities.slice(i, i + chunkSize);
    await repo.createQueryBuilder()
      .insert()
      .values(chunk as any[])
      .orIgnore()
      .execute();
  }
}

export async function bulkUpdate<T extends ObjectLiteral>(
  repo: Repository<T>,
  updates: Array<{ id: string; changes: Partial<T> }>,
  chunkSize: number = 200,
): Promise<void> {
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await repo.manager.transaction(async (em: EntityManager) => {
      for (const { id, changes } of chunk) {
        await em.update(repo.target, id, changes as any);
      }
    });
  }
}

export async function bulkDelete<T extends ObjectLiteral>(
  repo: Repository<T>,
  ids: string[],
  chunkSize: number = 500,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const result = await repo.delete(chunk as any);
    total += result.affected || 0;
  }
  return total;
}

// Transactional wrapper for multi-entity operations
export async function withTransaction<T>(
  manager: EntityManager,
  fn: (em: EntityManager) => Promise<T>,
): Promise<T> {
  return manager.transaction(fn);
}
