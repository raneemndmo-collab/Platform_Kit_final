// M6: Project Management - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectTask, ProjectMilestone, ProjectMember, TimeEntry } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project, 'm6_connection') private projectRepo: Repository<Project>,
    @InjectRepository(ProjectTask, 'm6_connection') private taskRepo: Repository<ProjectTask>,
    @InjectRepository(ProjectMilestone, 'm6_connection') private milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectMember, 'm6_connection') private memberRepo: Repository<ProjectMember>,
    @InjectRepository(TimeEntry, 'm6_connection') private timeRepo: Repository<TimeEntry>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Projects ===
  async createProject(tenantId: string, data: {
    name: string; description?: string; managerId: string;
    startDate?: Date; endDate?: Date; budget?: number; priority?: string;
  }): Promise<Project> {
    const count = await this.projectRepo.count({ where: { tenantId } });
    const code = `PRJ-${String(count + 1).padStart(4, '0')}`;
    const project = await this.projectRepo.save(this.projectRepo.create({ tenantId, code, ...data }));
    await this.memberRepo.save(this.memberRepo.create({ tenantId, projectId: project.id, userId: data.managerId, role: 'manager' }));
    this.safeEmit('project.created', { tenantId, projectId: project.id, name: data.name });
    return project;
  }

  async updateProject(tenantId: string, id: string, data: Partial<Project>): Promise<Project> {
    await this.projectRepo.update({ id, tenantId }, data);
    const updated = await this.projectRepo.findOneOrFail({ where: { id, tenantId } });
    this.safeEmit('project.updated', { tenantId, projectId: id, status: updated.status });
    return updated;
  }

  async getProject(tenantId: string, id: string): Promise<Project> {
    return this.projectRepo.findOneOrFail({ where: { id, tenantId } });
  }

  async listProjects(tenantId: string, status?: string): Promise<Project[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.projectRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // === Tasks ===
  async createTask(tenantId: string, projectId: string, data: {
    title: string; description?: string; assigneeId?: string; priority?: string;
    dueDate?: Date; estimatedHours?: number; parentTaskId?: string; milestoneId?: string;
  }): Promise<ProjectTask> {
    const task = await this.taskRepo.save(this.taskRepo.create({ tenantId, projectId, ...data }));
    this.safeEmit('project.task.created', { tenantId, projectId, taskId: task.id });
    return task;
  }

  async updateTask(tenantId: string, taskId: string, data: Partial<ProjectTask>): Promise<ProjectTask> {
    await this.taskRepo.update({ id: taskId, tenantId }, data);
    const task = await this.taskRepo.findOneOrFail({ where: { id: taskId, tenantId } });
    if (data.status) {
      this.safeEmit('project.task.status_changed', { tenantId, taskId, status: data.status, projectId: task.projectId });
      await this.recalculateProjectCompletion(tenantId, task.projectId);
    }
    return task;
  }

  async listTasks(tenantId: string, projectId: string, status?: string): Promise<ProjectTask[]> {
    const where: Record<string, unknown> = { tenantId, projectId };
    if (status) where.status = status;
    return this.taskRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async getMyTasks(tenantId: string, assigneeId: string): Promise<ProjectTask[]> {
    return this.taskRepo.find({ where: { tenantId, assigneeId, status: 'todo' }, order: { dueDate: 'ASC' } });
  }

  // === Milestones ===
  async createMilestone(tenantId: string, projectId: string, data: { name: string; dueDate: Date; description?: string }): Promise<ProjectMilestone> {
    return this.milestoneRepo.save(this.milestoneRepo.create({ tenantId, projectId, ...data }));
  }

  async listMilestones(tenantId: string, projectId: string): Promise<ProjectMilestone[]> {
    return this.milestoneRepo.find({ where: { tenantId, projectId }, order: { dueDate: 'ASC' } });
  }

  // === Members ===
  async addMember(tenantId: string, projectId: string, data: { userId: string; role: string; allocationPercent?: number }): Promise<ProjectMember> {
    return this.memberRepo.save(this.memberRepo.create({ tenantId, projectId, ...data }));
  }

  async listMembers(tenantId: string, projectId: string): Promise<ProjectMember[]> {
    return this.memberRepo.find({ where: { tenantId, projectId } });
  }

  // === Time Tracking ===
  async logTime(tenantId: string, data: { taskId: string; projectId: string; userId: string; hours: number; date: Date; description?: string }): Promise<TimeEntry> {
    const entry = await this.timeRepo.save(this.timeRepo.create({ tenantId, ...data }));
    await this.taskRepo.createQueryBuilder().update(ProjectTask)
      .set({ actualHours: () => `"actualHours" + ${data.hours}` })
      .where({ id: data.taskId, tenantId }).execute();
    return entry;
  }

  async getTimeEntries(tenantId: string, projectId: string): Promise<TimeEntry[]> {
    return this.timeRepo.find({ where: { tenantId, projectId }, order: { date: 'DESC' } });
  }

  // === Helpers ===
  private async recalculateProjectCompletion(tenantId: string, projectId: string): Promise<void> {
    const tasks = await this.taskRepo.find({ where: { tenantId, projectId } });
    if (tasks.length === 0) return;
    const done = tasks.reduce((___c, t) => (t.status === 'done') ? ___c + 1 : ___c, 0);
    const percent = (done / tasks.length) * 100;
    await this.projectRepo.update({ id: projectId, tenantId }, { completionPercent: percent });
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.projectRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
