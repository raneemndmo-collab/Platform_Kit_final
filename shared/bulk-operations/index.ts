// A3 FIX: Bulk Save Operations
import { Repository } from 'typeorm';

export async function bulkSave<T>(repo: Repository<T>, entities: T[], batchSize = 500): Promise<T[]> {
  if (entities.length === 0) return [];
  if (entities.length <= batchSize) return repo.save(entities as any[]);
  const results: T[] = [];
  for (let i = 0; i < entities.length; i += batchSize) {
    const saved = await repo.save(entities.slice(i, i + batchSize) as any[]);
    results.push(...saved);
  }
  return results;
}

export async function bulkUpsert<T>(repo: Repository<T>, entities: T[], conflictCols: string[], batchSize = 500): Promise<void> {
  for (let i = 0; i < entities.length; i += batchSize) {
    await repo.upsert(entities.slice(i, i + batchSize) as any[], conflictCols);
  }
}

export async function bulkDelete<T>(repo: Repository<T>, ids: string[], batchSize = 1000): Promise<number> {
  let total = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const r = await repo.delete(ids.slice(i, i + batchSize) as any);
    total += r.affected || 0;
  }
  return total;
}
