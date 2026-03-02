import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document, DocumentVersion, DocumentFolder, DocumentTemplate, DocumentApproval } from './domain/entities';
import { DocumentService } from './application/services/document.service';
import { DocumentController } from './api/controllers/document.controller';
import { PublishVersionHandler } from './application/commands/publish-version.handler';
import { CreateDocumentHandler } from './application/commands/create-document.handler';
import { ListDocumentsHandler } from './application/queries/list-documents.handler';
import { GetDocumentHandler } from './application/queries/get-document.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Document, DocumentVersion, DocumentFolder, DocumentTemplate, DocumentApproval], 'm7_connection')],
  controllers: [DocumentController],
  providers: [DocumentService, PublishVersionHandler, CreateDocumentHandler, ListDocumentsHandler, GetDocumentHandler],
  exports: [DocumentService],
})
export class DocumentModule {}
