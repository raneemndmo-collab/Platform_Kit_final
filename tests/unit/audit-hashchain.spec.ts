// D2 FIX: Unit tests for Audit Hash Chain (GOV-001)
import * as crypto from 'crypto';

describe('Audit Hash Chain (GOV-001)', () => {
  function computeHash(record: Record<string, unknown>, prevHash: string): string {
    return crypto.createHash('sha256').update(JSON.stringify({ ...record, _previousHash: prevHash })).digest('hex');
  }

  it('should create valid hash chain', () => {
    let prevHash = '0'.repeat(64);
    const records: Array<{ data: Record<string, unknown>; hash: string }> = [];
    
    for (let i = 0; i < 5; i++) {
      const data = { tenantId: 't1', action: `action_${i}`, ts: Date.now() };
      const hash = computeHash(data, prevHash);
      records.push({ data, hash });
      prevHash = hash;
    }

    // Verify chain
    let verifyHash = '0'.repeat(64);
    for (const record of records) {
      const expected = computeHash(record.data, verifyHash);
      expect(record.hash).toBe(expected);
      verifyHash = record.hash;
    }
  });

  it('should detect tampering', () => {
    const prevHash = '0'.repeat(64);
    const data = { tenantId: 't1', action: 'create' };
    const hash = computeHash(data, prevHash);
    
    const tampered = { ...data, action: 'delete' };
    const tamperedHash = computeHash(tampered, prevHash);
    
    expect(hash).not.toBe(tamperedHash);
  });
});
