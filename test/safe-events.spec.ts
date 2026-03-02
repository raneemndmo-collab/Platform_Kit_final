/**
 * A5/B3: Safe Events Tests
 */
import { SafeEventEmitter, MemoizedSorter, fireAndForget } from '../shared/safe-events';

describe('SafeEventEmitter', () => {
  let emitter: SafeEventEmitter;

  beforeEach(() => {
    emitter = new SafeEventEmitter();
  });

  it('should emit events to handlers', async () => {
    const received: string[] = [];
    emitter.on('test', async (data) => { received.push(data as string); });
    await emitter.emit('test', 'hello');
    expect(received).toEqual(['hello']);
  });

  it('should isolate handler errors', async () => {
    emitter.on('err', async () => { throw new Error('boom'); });
    emitter.on('err', async (data) => { /* success */ });
    const result = await emitter.emit('err', 'data');
    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should support wildcard patterns', async () => {
    const received: string[] = [];
    emitter.on('user.*', async (data) => { received.push(data as string); });
    await emitter.emit('user.created', 'new-user');
    expect(received).toEqual(['new-user']);
  });

  it('should track stats', async () => {
    emitter.on('e', async () => {});
    await emitter.emit('e', 1);
    await emitter.emit('e', 2);
    const stats = emitter.getStats();
    expect(stats.totalEmits).toBe(2);
    expect(stats.handlerCount).toBe(1);
  });

  it('should support emitWithTimeout', async () => {
    emitter.on('slow', async () => { await new Promise(r => setTimeout(r, 100)); });
    const result = await emitter.emitWithTimeout('slow', {}, 10);
    expect(result.timedOut).toBe(1);
  });
});

describe('MemoizedSorter', () => {
  it('should sort and cache results', () => {
    const sorter = new MemoizedSorter<{ score: number }>();
    const items = [{ score: 3 }, { score: 1 }, { score: 2 }];
    const sorted = sorter.sort(items, 'test', (a, b) => a.score - b.score);
    expect(sorted[0].score).toBe(1);
    expect(sorter.size).toBe(1);
  });

  it('should return cached results on repeat', () => {
    const sorter = new MemoizedSorter<{ score: number }>();
    const items = [{ score: 2 }, { score: 1 }];
    sorter.sort(items, 'test', (a, b) => a.score - b.score);
    const result = sorter.sort(items, 'test', (a, b) => a.score - b.score);
    expect(result[0].score).toBe(1);
  });

  it('should invalidate cache', () => {
    const sorter = new MemoizedSorter<{ score: number }>();
    sorter.sort([{ score: 1 }], 'test', () => 0);
    expect(sorter.size).toBe(1);
    sorter.invalidate();
    expect(sorter.size).toBe(0);
  });
});

describe('fireAndForget', () => {
  it('should not throw on error', () => {
    expect(() => {
      fireAndForget(async () => { throw new Error('boom'); }, 'test');
    }).not.toThrow();
  });
});
