// Rasid v6.4 — Core Shared Libraries Unit Tests
// D2 FIX: Unit tests for critical shared modules
import { SchemaValidationEngine, RASID_SCHEMAS } from '../../shared/schema-validation';
import { BoundedMap, BoundedArray } from '../../shared/bounded-collections';
import { memoizedSort, clearSortCache } from '../../shared/memoized-sort';

describe('SchemaValidationEngine', () => {
  let engine: SchemaValidationEngine;

  beforeEach(() => {
    engine = new SchemaValidationEngine();
    for (const [name, schema] of Object.entries(RASID_SCHEMAS)) {
      engine.registerSchema(name, schema);
    }
  });

  describe('type validation', () => {
    it('should validate string types', () => {
      const result = engine.validate('hello', { type: 'string' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject wrong types', () => {
      const result = engine.validate(42, { type: 'string' });
      expect(result.valid).toBe(false);
      expect(result.errors[0].keyword).toBe('type');
    });

    it('should validate number constraints', () => {
      expect(engine.validate(5, { type: 'number', minimum: 0, maximum: 10 }).valid).toBe(true);
      expect(engine.validate(-1, { type: 'number', minimum: 0 }).valid).toBe(false);
      expect(engine.validate(11, { type: 'number', maximum: 10 }).valid).toBe(false);
    });

    it('should validate integer type', () => {
      expect(engine.validate(5, { type: 'integer' }).valid).toBe(true);
      expect(engine.validate(5.5, { type: 'integer' }).valid).toBe(false);
    });
  });

  describe('string validation', () => {
    it('should validate minLength and maxLength', () => {
      expect(engine.validate('ab', { type: 'string', minLength: 3 }).valid).toBe(false);
      expect(engine.validate('abc', { type: 'string', minLength: 3 }).valid).toBe(true);
      expect(engine.validate('abcde', { type: 'string', maxLength: 3 }).valid).toBe(false);
    });

    it('should validate patterns', () => {
      expect(engine.validate('abc123', { type: 'string', pattern: '^[a-z]+\\d+$' }).valid).toBe(true);
      expect(engine.validate('ABC', { type: 'string', pattern: '^[a-z]+$' }).valid).toBe(false);
    });

    it('should validate formats', () => {
      expect(engine.validate('user@example.com', { type: 'string', format: 'email' }).valid).toBe(true);
      expect(engine.validate('not-an-email', { type: 'string', format: 'email' }).valid).toBe(false);
      expect(engine.validate('550e8400-e29b-41d4-a716-446655440000', { type: 'string', format: 'uuid' }).valid).toBe(true);
    });
  });

  describe('object validation', () => {
    it('should validate required fields', () => {
      const schema = { type: 'object' as const, required: ['name', 'age'], properties: { name: { type: 'string' as const }, age: { type: 'number' as const } } };
      expect(engine.validate({ name: 'test', age: 25 }, schema).valid).toBe(true);
      expect(engine.validate({ name: 'test' }, schema).valid).toBe(false);
    });

    it('should validate nested objects', () => {
      const schema = { type: 'object' as const, properties: { address: { type: 'object' as const, required: ['city'], properties: { city: { type: 'string' as const } } } } };
      expect(engine.validate({ address: { city: 'Riyadh' } }, schema).valid).toBe(true);
      expect(engine.validate({ address: {} }, schema).valid).toBe(false);
    });

    it('should block additional properties when configured', () => {
      const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } }, additionalProperties: false as const };
      expect(engine.validate({ name: 'test', extra: true }, schema).valid).toBe(false);
    });
  });

  describe('array validation', () => {
    it('should validate array items', () => {
      const schema = { type: 'array' as const, items: { type: 'number' as const } };
      expect(engine.validate([1, 2, 3], schema).valid).toBe(true);
      expect(engine.validate([1, 'a', 3], schema).valid).toBe(false);
    });
  });

  describe('enum validation', () => {
    it('should validate enum values', () => {
      expect(engine.validate('STRICT', { enum: ['STRICT', 'PROFESSIONAL', 'HYBRID'] }).valid).toBe(true);
      expect(engine.validate('INVALID', { enum: ['STRICT', 'PROFESSIONAL', 'HYBRID'] }).valid).toBe(false);
    });
  });

  describe('composition', () => {
    it('should validate anyOf', () => {
      const schema = { anyOf: [{ type: 'string' as const }, { type: 'number' as const }] };
      expect(engine.validate('hello', schema).valid).toBe(true);
      expect(engine.validate(42, schema).valid).toBe(true);
      expect(engine.validate(true, schema).valid).toBe(false);
    });
  });

  describe('Rasid schemas', () => {
    it('should validate tenant-context', () => {
      const result = engine.validate({ tenantId: '550e8400-e29b-41d4-a716-446655440000' }, 'tenant-context');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid tenant-context', () => {
      const result = engine.validate({}, 'tenant-context');
      expect(result.valid).toBe(false);
    });

    it('should validate execution-plan', () => {
      const plan = {
        id: 'plan_123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        selectedMode: 'STRICT',
        agents: [{ agent: 'layout', taskId: 'task_1', estimatedMs: 500, priority: 10, gpuRequired: true }],
        qualityThreshold: 0.999,
      };
      expect(engine.validate(plan, 'execution-plan').valid).toBe(true);
    });
  });
});

describe('BoundedMap', () => {
  it('should evict oldest entries when exceeding max size', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4); // Should evict 'a'
    expect(map.has('a')).toBe(false);
    expect(map.has('d')).toBe(true);
    expect(map.size).toBe(3);
  });

  it('should correctly get and set values', () => {
    const map = new BoundedMap<string, string>(100);
    map.set('key', 'value');
    expect(map.get('key')).toBe('value');
  });
});

describe('BoundedArray', () => {
  it('should not exceed max size', () => {
    const arr = new BoundedArray<number>(3);
    arr.push(1, 2, 3, 4, 5);
    expect(arr.length).toBeLessThanOrEqual(3);
  });
});

describe('memoizedSort', () => {
  beforeEach(() => clearSortCache());

  it('should sort items correctly', () => {
    const items = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
    const sorted = memoizedSort(items, 'test', (a, b) => a.id.localeCompare(b.id));
    expect(sorted.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('should return cached results on second call', () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const cmp = (a: { v: number }, b: { v: number }) => a.v - b.v;
    const first = memoizedSort(items, 'test2', cmp);
    const second = memoizedSort(items, 'test2', cmp);
    expect(first).toBe(second); // Same reference = cached
  });
});
