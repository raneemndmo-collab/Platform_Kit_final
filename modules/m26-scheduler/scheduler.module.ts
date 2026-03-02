import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledJob, JobExecution, JobQueue } from './domain/entities';
import { SchedulerService } from './application/services/scheduler.service';
import { SchedulerController } from './api/controllers/scheduler.controller';
import { ExecuteJobHandler } from './application/commands/execute-job.handler';
import { CreateJobHandler } from './application/commands/create-job.handler';
import { GetJobHandler } from './application/queries/get-job.handler';
import { ListJobsHandler } from './application/queries/list-jobs.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ScheduledJob, JobExecution, JobQueue], 'm26_connection')],
  controllers: [SchedulerController],
  providers: [SchedulerService, ExecuteJobHandler, CreateJobHandler, GetJobHandler, ListJobsHandler],
  exports: [SchedulerService],
})
export class SchedulerModule {}
