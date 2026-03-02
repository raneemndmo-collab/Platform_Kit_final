import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEntry, AuditRetentionPolicy, AuditExport } from './domain/entities';
import { AuditTrailService } from './application/services/audit-trail.service';
import { AuditTrailController } from './api/controllers/audit-trail.controller';
import { ExportTrailHandler } from './application/commands/export-trail.handler';
import { RecordEntryHandler } from './application/commands/record-entry.handler';
import { ListEntriesHandler } from './application/queries/list-entries.handler';
import { GetEntryHandler } from './application/queries/get-entry.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([AuditEntry, AuditRetentionPolicy, AuditExport], 'm27_connection')],
  controllers: [AuditTrailController],
  providers: [AuditTrailService, ExportTrailHandler, RecordEntryHandler, ListEntriesHandler, GetEntryHandler],
  exports: [AuditTrailService],
})
export class AuditTrailModule {}
