// =============================================================================
// Rasid Platform v6.4 — Application Bootstrap
// Constitutional: P-005 (Stateless), P-008 (Horizontal Scaling)
// Phase 3: Full Integration — CORS, Swagger, Validation, Security
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CorsConfigService } from '../shared/cors';
import { setupSwagger, setupOpenApiJson } from '../shared/swagger';
import { InputSanitizationMiddleware } from '../shared/security/input-sanitizer';
import { GracefulShutdownService } from '../shared/health/graceful-shutdown.service';
import { StructuredLogger } from '../shared/structured-logger';

async function bootstrap() {
  // D4 FIX: Use StructuredLogger (Pino-compatible JSON) instead of NestJS default
  const structuredLogger = new StructuredLogger();
  structuredLogger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: structuredLogger,
    abortOnError: false,
  });

  // ─── Security Headers (SEC-001) ───
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // ─── CORS (SEC-007) ───
  const corsService = new CorsConfigService();
  app.enableCors(corsService.getNestCorsOptions() as any);

  // ─── Input Sanitization (SEC-005) ───
  app.use(InputSanitizationMiddleware);

  // ─── API Versioning (C5) ───
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // ─── Validation (B2) ───
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    forbidUnknownValues: true,
    stopAtFirstError: false,
    errorHttpStatusCode: 422,
    exceptionFactory: (errors) => {
      const messages = errors.map(e => ({
        field: e.property,
        errors: Object.values(e.constraints ?? {}),
      }));
      return { statusCode: 422, message: 'Validation failed', errors: messages };
    },
  }));

  // ─── Swagger (D5) ───
  if (process.env['NODE_ENV'] !== 'production' || process.env['ENABLE_SWAGGER'] === 'true') {
    setupSwagger(app);
    setupOpenApiJson(app);
  }

  // ─── Global Prefix ───
  app.setGlobalPrefix('', { exclude: ['api/docs', 'api/openapi.json', 'health', 'health/ready', 'health/live', 'metrics'] });

  // ─── Graceful Shutdown (E3) ───
  const shutdownService = app.get(GracefulShutdownService);
  const shutdown = async (signal: string) => {
    structuredLogger.warn(`Received ${signal}, starting graceful shutdown...`);
    await shutdownService.onApplicationShutdown(signal);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ─── Start ───
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port);

  structuredLogger.log('═'.repeat(72));
  structuredLogger.log('  RASID PLATFORM v6.4 — Full Stack (Phase 0-8)');
  structuredLogger.log('═'.repeat(72));
  structuredLogger.log(`  Server:     http://localhost:${port}`);
  structuredLogger.log(`  Swagger:    http://localhost:${port}/api/docs`);
  structuredLogger.log(`  OpenAPI:    http://localhost:${port}/api/openapi.json`);
  structuredLogger.log(`  Health:     http://localhost:${port}/health`);
  structuredLogger.log(`  Metrics:    http://localhost:${port}/metrics`);
  structuredLogger.log(`  Env:        ${process.env['NODE_ENV'] ?? 'development'}`);
  structuredLogger.log(`  CORS:       ${corsService.getConfig().allowedOrigins.join(', ')}`);
  structuredLogger.log(`  Kernels:    K1-K10 | Modules: M1-M31 | Tier X: D1-D13`);
  structuredLogger.log(`  Security:   JWT + RLS + RBAC + Rate Limit + Encryption`);
  structuredLogger.log('═'.repeat(72));
}

bootstrap();
