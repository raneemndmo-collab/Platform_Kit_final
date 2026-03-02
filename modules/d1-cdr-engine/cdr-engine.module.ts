import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CDRDocument, CDRVersion, ParseJob, FormatParser } from './domain/entities';
import { CDREngineService } from './application/services/cdr-engine.service';
import { CDREngineController } from './api/controllers/cdr-engine.controller';
import { ValidateCdrHandler } from './application/commands/validate-cdr.handler';
import { ParseDocumentHandler } from './application/commands/parse-document.handler';
import { GetCdrHandler } from './application/queries/get-cdr.handler';
import { ListCdrsHandler } from './application/queries/list-cdrs.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([CDRDocument, CDRVersion, ParseJob, FormatParser], 'd1_connection')],
  controllers: [CDREngineController],
  providers: [CDREngineService, ValidateCdrHandler, ParseDocumentHandler, GetCdrHandler, ListCdrsHandler],
  exports: [CDREngineService],
})
export class CDREngineModule {}
