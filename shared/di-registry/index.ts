/**
 * C1: SharedEnginesModule — NestJS DI Registration
 * ────────────────────────────────────────────────────────
 * Central registry of all shared engines as Injectable providers.
 * Imports all shared libraries and exports them globally.
 * Constitutional: C1 (Proper DI vs manual instantiation)
 */
import { Module, Global } from '@nestjs/common';
import { RedisCacheService } from '../redis-cache';
import { MessageQueueService } from '../message-queue';
import { EncryptionService } from '../encryption';
import { CorsConfigService } from '../cors';

// ─── Shared Engine Wrappers ───
// Each shared engine is wrapped as an Injectable singleton provider.

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '../structured-logger';
import { RedisPubSubService, RedisPermissionCache } from '../redis-pubsub';
import { JwtRsaKeyManager } from '../jwt-rsa';

@Injectable()
export class TripleVerificationProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../triple-verification');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class CircuitBreakerProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../circuit-breaker');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class BoundedCollectionsProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../bounded-collections');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class CognitiveLoadProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../cognitive-load');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class BulkOperationsProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../database/bulk-operations');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class ParallelExecutionProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../parallel');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class InsightEngineProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../insight-engine');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class FormulaInferenceProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../formula-inference');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class DataQualityProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../data-quality');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class WorkloadPredictionProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../workload-prediction');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class VisualStabilityProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../visual-stability');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class BalanceCorrectionProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../balance-correction');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class MCGESolverProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../mcge-solver');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class ScriptLayoutProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../script-layout');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class ExtremeDataProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../extreme-data');
      this.engine = mod;
    }
    return this.engine;
  }
}

@Injectable()
export class TracingProvider {
  private engine: unknown;
  getEngine() {
    if (!this.engine) {
      const mod = require('../observability/tracing');
      this.engine = mod;
    }
    return this.engine;
  }
}

const ALL_PROVIDERS = [
  RedisCacheService,
  MessageQueueService,
  EncryptionService,
  CorsConfigService,
  TripleVerificationProvider,
  CircuitBreakerProvider,
  BoundedCollectionsProvider,
  CognitiveLoadProvider,
  BulkOperationsProvider,
  ParallelExecutionProvider,
  InsightEngineProvider,
  FormulaInferenceProvider,
  DataQualityProvider,
  WorkloadPredictionProvider,
  VisualStabilityProvider,
  BalanceCorrectionProvider,
  MCGESolverProvider,
  ScriptLayoutProvider,
  ExtremeDataProvider,
  TracingProvider,
];

@Global()
@Module({
  providers: ALL_PROVIDERS,
  exports: ALL_PROVIDERS,
})
export class SharedEnginesModule {}
