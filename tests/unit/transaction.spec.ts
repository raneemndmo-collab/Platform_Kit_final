// D2 FIX: Unit tests for Transaction utility (ARC-005)
import { transactional } from '../../shared/transaction';

describe('Transactional (ARC-005)', () => {
  it('should commit on success', async () => {
    const mockManager = { save: jest.fn().mockResolvedValue({ id: 1 }) };
    const mockQR = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(), manager: mockManager, query: jest.fn(),
    };
    const mockDS = { createQueryRunner: () => mockQR } as any;

    await transactional(mockDS, async (mgr) => mgr.save({ data: 'test' }));
    expect(mockQR.commitTransaction).toHaveBeenCalled();
    expect(mockQR.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    const mockQR = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(), query: jest.fn(),
      manager: { save: jest.fn().mockRejectedValue(new Error('DB error')) },
    };
    const mockDS = { createQueryRunner: () => mockQR } as any;

    await expect(transactional(mockDS, async (mgr) => mgr.save({}))).rejects.toThrow('DB error');
    expect(mockQR.rollbackTransaction).toHaveBeenCalled();
    expect(mockQR.release).toHaveBeenCalled();
  });
});
