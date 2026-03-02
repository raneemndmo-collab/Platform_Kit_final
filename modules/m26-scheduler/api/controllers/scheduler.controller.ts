import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { SchedulerService } from '../../application/services/scheduler.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/scheduler')
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  @Post('jobs') @Audit('internal')
  async createJob(@Body() b: Record<string, unknown>) { return this.service.createJob(b.tenantId, b); }

  @Put('jobs/:id') @Audit('internal')
  async updateJob(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.updateJob(b.tenantId, id, b); }

  @Post('jobs/:id/pause') @Audit('internal')
  async pause(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.pauseJob(b.tenantId, id); }

  @Post('jobs/:id/resume') @Audit('internal')
  async resume(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.resumeJob(b.tenantId, id); }

  @Delete('jobs/:id') @Audit('restricted')
  async delete(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.deleteJob(b.tenantId, id); }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getJob(t, id); }

  @Get('jobs')
  async listJobs(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listJobs(t, s); }

  @Get('jobs/:id/executions')
  async executions(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getExecutions(t, id); }

  @Post('queues') @Audit('internal')
  async createQueue(@Body() b: Record<string, unknown>) { return this.service.createQueue(b.tenantId, b); }

  @Get('queues')
  async listQueues(@Query('tenantId') t: string) { return this.service.listQueues(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
