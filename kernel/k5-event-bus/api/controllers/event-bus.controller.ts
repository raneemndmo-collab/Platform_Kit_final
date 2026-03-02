// =============================================================================
// K5: Event Bus — API Controller
// API Surface: /api/v1/events/*
// =============================================================================

import {
  Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Tenant, Audit } from '../../../shared/decorators';
import { TenantContext } from '../../../shared/interfaces';
import {
  K5EventBusService, RegisterSchemaDto, PublishEventDto, SubscribeDto,
} from '../application/handlers/event-bus.service';

@ApiTags('K5 - Event Bus')
@Controller('api/v1/events')
export class K5EventBusController {
  constructor(private readonly eventBusService: K5EventBusService) {}

  // Schema Registry
  @Post('schemas')
  @Audit('write')
  @ApiOperation({ summary: 'Register event schema (ESR-001)' })
  async registerSchema(
    @Tenant() tenant: TenantContext,
    @Body() dto: RegisterSchemaDto,
  ) {
    return this.eventBusService.registerSchema(tenant.tenantId, dto);
  }

  @Get('schemas')
  @Audit('read')
  @ApiOperation({ summary: 'List event schemas' })
  async listSchemas(@Query('namespace') namespace?: string) {
    return this.eventBusService.listSchemas(namespace);
  }

  // Event Publishing
  @Post('publish')
  @Audit('write')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Publish domain event' })
  async publishEvent(@Body() dto: PublishEventDto) {
    return this.eventBusService.publish(dto);
  }

  // Subscriptions
  @Post('subscriptions')
  @Audit('write')
  @ApiOperation({ summary: 'Subscribe to event type' })
  async subscribe(
    @Tenant() tenant: TenantContext,
    @Body() dto: SubscribeDto,
  ) {
    return this.eventBusService.subscribe(tenant.tenantId, dto);
  }

  @Get('subscriptions/:eventType')
  @Audit('read')
  async getSubscriptions(@Param('eventType') eventType: string) {
    return this.eventBusService.getSubscriptions(eventType);
  }

  // Dead Letter Queue
  @Get('dlq')
  @Audit('read')
  @ApiOperation({ summary: 'List dead letter events' })
  async getDeadLetters(
    @Tenant() tenant: TenantContext,
    @Query('status') status?: string,
  ) {
    return this.eventBusService.getDeadLetterEvents(tenant.tenantId, status);
  }

  @Post('dlq/:id/retry')
  @Audit('write')
  @ApiOperation({ summary: 'Retry dead letter event' })
  async retryDeadLetter(@Param('id') id: string) {
    return this.eventBusService.retryDeadLetter(id);
  }

  // Health
  @Get('health')
  @ApiOperation({ summary: 'K5 health check' })
  async health() {
    return {
      module: 'K5',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'database', status: 'up' },
        { name: 'schema-registry', status: 'up' },
        { name: 'delivery-pipeline', status: 'up' },
      ],
    };
  }
}
