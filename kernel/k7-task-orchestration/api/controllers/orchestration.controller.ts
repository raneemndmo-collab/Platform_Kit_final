// =============================================================================
// K7: Task Orchestration Controller
// =============================================================================

import { Controller, Post, Get, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K7OrchestrationService } from '../../application/handlers/orchestration.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K7: Task Orchestration')
@ApiBearerAuth()
@Controller('api/v1/orchestration')
export class OrchestrationController {
  constructor(private readonly orchService: K7OrchestrationService) {}

  @Post('sagas')
  @Audit('internal')
  @ApiOperation({ summary: 'Start a new saga' })
  async startSaga(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      sagaType: string; initiatorModule: string;
      context: Record<string, unknown>; correlationId?: string;
    },
  ) {
    return this.orchService.startSaga(tenant.tenantId, dto);
  }

  @Put('sagas/:id/advance')
  @Audit('internal')
  @ApiOperation({ summary: 'Advance saga to next step' })
  async advanceSaga(
    @Param('id') sagaId: string,
    @Body() dto: { status: 'success' | 'failure'; result?: unknown; error?: string },
  ) {
    return this.orchService.advanceSaga(sagaId, dto);
  }

  @Get('sagas/:id')
  @ApiOperation({ summary: 'Get saga details' })
  async getSaga(
    @Tenant() tenant: { tenantId: string },
    @Param('id') sagaId: string,
  ) {
    return this.orchService.getSaga(tenant.tenantId, sagaId);
  }

  @Get('sagas')
  @ApiOperation({ summary: 'List sagas' })
  async getSagas(
    @Tenant() tenant: { tenantId: string },
    @Query('status') status?: string,
  ) {
    return this.orchService.getSagas(tenant.tenantId, status);
  }

  @Post('sagas/:type/steps')
  @Audit('internal')
  @ApiOperation({ summary: 'Define saga step definitions' })
  async defineSteps(
    @Tenant() tenant: { tenantId: string },
    @Param('type') sagaType: string,
    @Body() steps: Array<{
      stepOrder: number; name: string; targetModule: string;
      actionEndpoint: string; compensationEndpoint?: string;
    }>,
  ) {
    return this.orchService.defineSteps(tenant.tenantId, sagaType, steps);
  }

  @Post('jobs')
  @Audit('internal')
  @ApiOperation({ summary: 'Create scheduled job' })
  async createJob(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      name: string; moduleId: string; cronExpression: string;
      handlerEndpoint: string; payload?: Record<string, unknown>;
    },
  ) {
    return this.orchService.createJob(tenant.tenantId, dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List scheduled jobs' })
  async getJobs(
    @Tenant() tenant: { tenantId: string },
    @Query('status') status?: string,
  ) {
    return this.orchService.getJobs(tenant.tenantId, status);
  }

  @Put('jobs/:id/pause')
  @Audit('internal')
  @ApiOperation({ summary: 'Pause scheduled job' })
  async pauseJob(@Tenant() tenant: { tenantId: string }, @Param('id') jobId: string) {
    return this.orchService.pauseJob(tenant.tenantId, jobId);
  }

  @Put('jobs/:id/resume')
  @Audit('internal')
  @ApiOperation({ summary: 'Resume scheduled job' })
  async resumeJob(@Tenant() tenant: { tenantId: string }, @Param('id') jobId: string) {
    return this.orchService.resumeJob(tenant.tenantId, jobId);
  }

  @Get('executions')
  @ApiOperation({ summary: 'List task executions' })
  async getExecutions(
    @Tenant() tenant: { tenantId: string },
    @Query('jobId') jobId?: string,
    @Query('sagaId') sagaId?: string,
    @Query('status') status?: string,
  ) {
    return this.orchService.getExecutions(tenant.tenantId, { jobId, sagaId, status });
  }

  @Get('health')
  @ApiOperation({ summary: 'K7 health check' })
  async health() {
    return this.orchService.getHealth();
  }
}
