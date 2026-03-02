import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KGNode, KGEdge, KGQuery } from './domain/entities';
import { KnowledgeGraphService } from './application/services/knowledge-graph.service';
import { KnowledgeGraphController } from './api/controllers/knowledge-graph.controller';
import { CreateEntityHandler } from './application/commands/create-entity.handler';
import { CreateRelationHandler } from './application/commands/create-relation.handler';
import { QueryGraphHandler } from './application/queries/query-graph.handler';
import { GetEntityHandler } from './application/queries/get-entity.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([KGNode, KGEdge, KGQuery], 'm15_connection')],
  controllers: [KnowledgeGraphController], providers: [KnowledgeGraphService, CreateEntityHandler, CreateRelationHandler, QueryGraphHandler, GetEntityHandler], exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
