/**
 * C3: Message Queue Service Tests
 */
import { MessageQueueService } from '../shared/message-queue';

describe('MessageQueueService', () => {
  let mq: MessageQueueService;

  beforeEach(() => {
    mq = new MessageQueueService();
  });

  afterEach(() => {
    mq.onModuleDestroy();
  });

  describe('publish and process', () => {
    it('should process a job through registered handler', async () => {
      const results: string[] = [];
      mq.registerHandler('test-queue', async (job) => {
        results.push(job.data as string);
      });
      await mq.publish('test-queue', 'hello');
      // Wait for async processing
      await new Promise(r => setTimeout(r, 50));
      expect(results).toEqual(['hello']);
    });

    it('should respect priority ordering', async () => {
      const processed: number[] = [];
      mq.registerQueue('pq');
      // Publish 3 jobs with different priorities before adding handler
      await mq.publish('pq', 1, { priority: 5 });
      await mq.publish('pq', 2, { priority: 1 }); // highest
      await mq.publish('pq', 3, { priority: 10 }); // lowest
      mq.registerHandler('pq', async (job) => {
        processed.push(job.data as number);
      });
      await new Promise(r => setTimeout(r, 100));
      expect(processed).toEqual([2, 1, 3]);
    });
  });

  describe('retry and dead-letter', () => {
    it('should retry failed jobs', async () => {
      let attempts = 0;
      mq.registerHandler('retry-q', async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
      });
      await mq.publish('retry-q', 'data', { retries: 3, retryDelay: 10 });
      await new Promise(r => setTimeout(r, 500));
      expect(attempts).toBe(3);
    });

    it('should move to dead-letter after max retries', async () => {
      mq.registerHandler('dl-q', async () => { throw new Error('always fail'); });
      await mq.publish('dl-q', 'data', { retries: 1, retryDelay: 10 });
      await new Promise(r => setTimeout(r, 500));
      const dl = mq.getDeadLetterJobs('dl-q');
      expect(dl.length).toBe(1);
      expect(dl[0].status).toBe('dead-letter');
    });
  });

  describe('batch publish', () => {
    it('should publish multiple jobs', async () => {
      const received: number[] = [];
      mq.registerHandler('batch-q', async (job) => {
        received.push(job.data as number);
      });
      await mq.publishBatch('batch-q', [1, 2, 3]);
      await new Promise(r => setTimeout(r, 100));
      expect(received.sort()).toEqual([1, 2, 3]);
    });
  });

  describe('stats', () => {
    it('should track queue statistics', async () => {
      mq.registerHandler('stat-q', async () => {});
      await mq.publish('stat-q', 'data');
      await new Promise(r => setTimeout(r, 50));
      const stats = mq.getQueueStats('stat-q');
      expect(stats).not.toBeNull();
      expect(stats!.processed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('retry dead letter', () => {
    it('should retry dead-letter jobs', async () => {
      let failCount = 0;
      mq.registerHandler('rdl-q', async () => {
        failCount++;
        if (failCount <= 2) throw new Error('fail');
      });
      await mq.publish('rdl-q', 'data', { retries: 0, retryDelay: 10 });
      await new Promise(r => setTimeout(r, 100));
      expect(mq.getDeadLetterJobs('rdl-q').length).toBe(1);
      const retried = await mq.retryDeadLetter('rdl-q');
      expect(retried).toBe(1);
      await new Promise(r => setTimeout(r, 100));
    });
  });
});
