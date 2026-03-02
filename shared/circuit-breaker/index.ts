// =============================================================================
import { BoundedMap } from '../bounded-collections';
// C6 FIX: Circuit Breaker Pattern
// Prevents cascade failures when external services or modules fail
// =============================================================================

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successesInHalfOpen = 0;

  constructor(
    private readonly name: string = 'default',
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 30_000,
    private readonly halfOpenSuccessThreshold: number = 3,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successesInHalfOpen = 0;
        this.logger.log(`Circuit ${this.name}: OPEN → HALF_OPEN`);
      } else {
        throw new ServiceUnavailableException(
          `Circuit breaker '${this.name}' is OPEN. Service temporarily unavailable.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successesInHalfOpen++;
      if (this.successesInHalfOpen >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.logger.log(`Circuit ${this.name}: HALF_OPEN → CLOSED`);
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.logger.warn(`Circuit ${this.name}: → OPEN (failures: ${this.failures})`);
    }
  }

  getState(): { name: string; state: CircuitState; failures: number } {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}

/** Factory to create named circuit breakers */
@Injectable()
export class CircuitBreakerFactory {
  private readonly breakers = new BoundedMap<string, CircuitBreaker>(10_000);

  get(name: string, options?: { failureThreshold?: number; resetTimeoutMs?: number }): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(
        name, options?.failureThreshold ?? 5, options?.resetTimeoutMs ?? 30_000
      ));
    }
    return this.breakers.get(name)!;
  }

  getAll(): Array<{ name: string; state: string; failures: number }> {
    return [...this.breakers.values()].map(b => b.getState());
  }
}
