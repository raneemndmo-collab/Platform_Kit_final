// A7 FIX: Memoized sort for repeated sorting of same data
const sortCache = new Map<string, unknown[]>();
const MAX_CACHE = 100;

export function memoizedSort<T>(items: T[], key: string, compareFn: (a: T, b: T) => number): T[] {
  const cacheKey = `${key}:${items.length}:${JSON.stringify(items[0])}`;
  const cached = sortCache.get(cacheKey);
  if (cached) return cached as T[];
  const sorted = [...items].sort(compareFn);
  if (sortCache.size >= MAX_CACHE) { const fk = sortCache.keys().next().value; if (fk) sortCache.delete(fk); }
  sortCache.set(cacheKey, sorted);
  return sorted;
}
export function clearSortCache(): void { sortCache.clear(); }
