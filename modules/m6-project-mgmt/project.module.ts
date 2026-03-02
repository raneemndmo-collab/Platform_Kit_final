import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, ProjectTask, ProjectMilestone, ProjectMember, TimeEntry } from './domain/entities';
import { ProjectService } from './application/services/project.service';
import { ProjectController } from './api/controllers/project.controller';
import { CreateProjectHandler } from './application/commands/create-project.handler';
import { UpdatePhaseHandler } from './application/commands/update-phase.handler';
import { ListProjectsHandler } from './application/queries/list-projects.handler';
import { GetProjectHandler } from './application/queries/get-project.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Project, ProjectTask, ProjectMilestone, ProjectMember, TimeEntry], 'm6_connection')],
  controllers: [ProjectController],
  providers: [ProjectService, CreateProjectHandler, UpdatePhaseHandler, ListProjectsHandler, GetProjectHandler],
  exports: [ProjectService],
})
export class ProjectModule {}
