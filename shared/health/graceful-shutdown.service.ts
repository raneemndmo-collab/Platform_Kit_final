// Rasid v6.4 — Graceful Shutdown — E3/DEP-001 Fix
import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly cleanupHandlers: Array<() => Promise<void>> = [];

  registerCleanup(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Graceful shutdown initiated (signal: ${signal || 'unknown'})`);
    
    const timeout = setTimeout(() => {
      this.logger.error('Shutdown timeout exceeded — forcing exit');
      process.exit(1);
    }, 30000);

    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        this.logger.error(`Cleanup handler failed: ${error}`);
      }
    }

    clearTimeout(timeout);
    this.logger.log('Graceful shutdown completed');
  }
}
