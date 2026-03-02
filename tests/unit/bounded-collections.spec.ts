// D2 FIX: Unit tests for BoundedMap (B4)
import { BoundedMap } from '../../shared/bounded-collections';

describe('BoundedMap (B4)', () => {
  it('should evict oldest entries when full', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4); // should evict 'a'
    expect(map.has('a')).toBe(false);
    expect(map.get('d')).toBe(4);
    expect(map.size).toBe(3);
  });

  it('should work as LRU with getAndTouch', () => {
    const map = new BoundedMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.getAndTouch('a'); // touch 'a', making 'b' oldest
    map.set('d', 4); // should evict 'b' now
    expect(map.has('a')).toBe(true);
    expect(map.has('b')).toBe(false);
  });
});
