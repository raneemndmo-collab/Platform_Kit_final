import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ProjectService } from '../../application/services/project.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Post() @Audit('internal')
  async create(@Body() b: Record<string, unknown>) { return this.service.createProject(b.tenantId, b); }

  @Put(':id') @Audit('internal')
  async update(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.updateProject(b.tenantId, id, b); }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getProject(t, id); }

  @Get()
  async list(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listProjects(t, s); }

  @Post(':id/tasks') @Audit('internal')
  async createTask(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.createTask(b.tenantId, id, b); }

  @Put('tasks/:taskId') @Audit('internal')
  async updateTask(@Param('taskId') tid: string, @Body() b: Record<string, unknown>) { return this.service.updateTask(b.tenantId, tid, b); }

  @Get(':id/tasks')
  async listTasks(@Param('id') id: string, @Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listTasks(t, id, s); }

  @Get('my-tasks')
  async myTasks(@Query('tenantId') t: string, @Query('assigneeId') a: string) { return this.service.getMyTasks(t, a); }

  @Post(':id/milestones') @Audit('internal')
  async createMilestone(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.createMilestone(b.tenantId, id, b); }

  @Get(':id/milestones')
  async listMilestones(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.listMilestones(t, id); }

  @Post(':id/members') @Audit('internal')
  async addMember(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.addMember(b.tenantId, id, b); }

  @Get(':id/members')
  async listMembers(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.listMembers(t, id); }

  @Post('time-entries') @Audit('internal')
  async logTime(@Body() b: Record<string, unknown>) { return this.service.logTime(b.tenantId, b); }

  @Get(':id/time-entries')
  async timeEntries(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getTimeEntries(t, id); }

  @Get('health')
  async health() { return this.service.health(); }
}
