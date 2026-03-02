// Rasid v6.4 — Health + Metrics Controller
import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics';

// @Public() — skip auth for health checks
@Controller()
export class HealthController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('health')
  getHealth() {
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
    };
  }

  @Get('health/ready')
  getReadiness() {
    // Add DB connectivity check in production
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('health/live')
  getLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('metrics')
  getMetrics() {
    return this.metrics.toPrometheusFormat();
  }
}
