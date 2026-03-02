// Rasid v6.4 — Bounded Collections Tests — D2 Fix
import { BoundedMap, BoundedArray } from '../shared/bounded-collections';

describe('BoundedMap', () => {
  it('should enforce max size', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4); // Should evict 'a'
    expect(map.size).toBe(3);
    expect(map.has('a')).toBe(false);
    expect(map.has('d')).toBe(true);
  });

  it('should allow reads within bounds', () => {
    const map = new BoundedMap<string, number>(10);
    map.set('x', 42);
    expect(map.get('x')).toBe(42);
  });
});

describe('BoundedArray', () => {
  it('should trim when exceeding max size', () => {
    const arr = new BoundedArray<number>(10);
    for (let i = 0; i < 15; i++) arr.push(i);
    expect(arr.length).toBeLessThanOrEqual(10);
  });

  it('should preserve most recent items after trim', () => {
    const arr = new BoundedArray<number>(10);
    for (let i = 0; i < 20; i++) arr.push(i);
    const items = arr.toArray();
    expect(items[items.length - 1]).toBe(19);
  });
});
