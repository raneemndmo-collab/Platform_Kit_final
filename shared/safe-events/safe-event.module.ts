// B3 FIX: Global Safe Event Emitter
// Wraps ALL event emissions to prevent listener errors from crashing business logic
// Registered as a global module so all services benefit automatically
import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Global()
@Module({})
export class SafeEventModule implements OnModuleInit {
  private readonly logger = new Logger('SafeEventModule');

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit(): void {
    // B3: Patch the global EventEmitter2 to catch all listener errors
    const originalEmit = this.eventEmitter.emit.bind(this.eventEmitter);
    const logger = this.logger;

    this.eventEmitter.emit = function safeEmit(event: string | symbol, ...args: unknown[]): boolean {
      try {
        return originalEmit(event, ...args);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`B3: Event listener error for '${String(event)}': ${msg}`);
        // Emit error event for monitoring (but don't recurse)
        if (event !== 'event.listener.error') {
          try {
            originalEmit('event.listener.error', { event: String(event), error: msg, timestamp: new Date() });
          } catch { /* prevent infinite recursion */ }
        }
        return false;
      }
    };

    // Also patch emitAsync
    const originalEmitAsync = this.eventEmitter.emitAsync?.bind(this.eventEmitter);
    if (originalEmitAsync) {
      this.eventEmitter.emitAsync = async function safeEmitAsync(event: string | symbol, ...args: unknown[]): Promise<unknown[]> {
        try {
          return await originalEmitAsync(event, ...args);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`B3: Async event listener error for '${String(event)}': ${msg}`);
          return [];
        }
      };
    }

    this.logger.log('B3: Global safe event emission enabled — all listener errors are now caught');
  }
}
