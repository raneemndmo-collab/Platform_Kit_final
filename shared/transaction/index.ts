// ARC-005 FIX: Transaction Boundaries
import { DataSource, QueryRunner, EntityManager } from 'typeorm';

export async function transactional<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
): Promise<T> {
  const qr: QueryRunner = dataSource.createQueryRunner();
  await qr.connect();
  if (isolationLevel) await qr.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
  await qr.startTransaction();
  try {
    const result = await work(qr.manager);
    await qr.commitTransaction();
    return result;
  } catch (error) {
    await qr.rollbackTransaction();
    throw error;
  } finally {
    await qr.release();
  }
}

export function Transactional(isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE') {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const ds: DataSource = (this as any).dataSource;
      if (!ds) throw new Error('ARC-005: @Transactional requires this.dataSource');
      return transactional(ds, async (manager) => {
        const origRepo = (this as any).repo;
        (this as any).repo = manager.getRepository(origRepo.target);
        try { return await original.apply(this, args); }
        finally { (this as any).repo = origRepo; }
      }, isolationLevel);
    };
    return descriptor;
  };
}
