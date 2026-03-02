// M6: Project Management - Domain Entities
// Database: projects_db | Event Namespace: project.*
// Purpose: Project lifecycle, tasks, milestones, resource allocation, Gantt, time tracking

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('projects')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'managerId'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  code: string; // PRJ-001

  @Column({ default: 'planning' })
  status: string; // planning, active, on_hold, completed, cancelled

  @Column({ nullable: true })
  managerId: string;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  budget: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercent: number;

  @Column({ default: 'medium' })
  priority: string; // low, medium, high, critical

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('project_tasks')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'assigneeId'])
@Index(['tenantId', 'status'])
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  projectId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'todo' })
  status: string; // todo, in_progress, review, done, blocked

  @Column({ default: 'medium' })
  priority: string;

  @Column({ nullable: true })
  assigneeId: string;

  @Column({ nullable: true })
  parentTaskId: string;

  @Column({ nullable: true })
  milestoneId: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  actualHours: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: string[]; // Task IDs this depends on

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('project_milestones')
@Index(['tenantId', 'projectId'])
export class ProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ default: 'pending' })
  status: string; // pending, completed, overdue

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('project_members')
@Index(['tenantId', 'projectId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column()
  role: string; // manager, member, viewer

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  allocationPercent: number;

  @CreateDateColumn()
  joinedAt: Date;
}

@Entity('time_entries')
@Index(['tenantId', 'taskId'])
@Index(['tenantId', 'userId'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  taskId: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  hours: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
