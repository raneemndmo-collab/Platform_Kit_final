import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenderJob, OutputArtifact, FormatRenderer, RenderCache } from './domain/entities';
import { RenderingEngineService } from './application/services/rendering-engine.service';
import { RenderingEngineController } from './api/controllers/rendering-engine.controller';
import { RenderPreviewHandler } from './application/commands/render-preview.handler';
import { RenderDocumentHandler } from './application/commands/render-document.handler';
import { ListRendersHandler } from './application/queries/list-renders.handler';
import { GetRenderHandler } from './application/queries/get-render.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([RenderJob, OutputArtifact, FormatRenderer, RenderCache], 'd5_connection')],
  controllers: [RenderingEngineController],
  providers: [RenderingEngineService, RenderPreviewHandler, RenderDocumentHandler, ListRendersHandler, GetRenderHandler],
  exports: [RenderingEngineService],
})
export class RenderingEngineModule {}
