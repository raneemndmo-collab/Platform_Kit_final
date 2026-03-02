import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportDefinition, ReportExecution, ReportSchedule, ReportTemplate } from './domain/entities';
import { ReportingService } from './application/services/reporting.service';
import { ReportingController } from './api/controllers/reporting.controller';
import { GenerateReportHandler } from './application/commands/generate-report.handler';
import { CreateReportDefHandler } from './application/commands/create-report-def.handler';
import { ListReportsHandler } from './application/queries/list-reports.handler';
import { GetReportHandler } from './application/queries/get-report.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ReportDefinition, ReportExecution, ReportSchedule, ReportTemplate], 'm13_connection')],
  controllers: [ReportingController],
  providers: [ReportingService, GenerateReportHandler, CreateReportDefHandler, ListReportsHandler, GetReportHandler],
  exports: [ReportingService],
})
export class ReportingModule {}
