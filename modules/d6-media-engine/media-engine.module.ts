import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset, GenerationJob, VideoComposition } from './domain/entities';
import { MediaEngineService } from './application/services/media-engine.service';
import { MediaEngineController } from './api/controllers/media-engine.controller';
import { OptimizeImageHandler } from './application/commands/optimize-image.handler';
import { ProcessMediaHandler } from './application/commands/process-media.handler';
import { GetAssetHandler } from './application/queries/get-asset.handler';
import { ListAssetsHandler } from './application/queries/list-assets.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([MediaAsset, GenerationJob, VideoComposition], 'd6_connection')],
  controllers: [MediaEngineController],
  providers: [MediaEngineService, OptimizeImageHandler, ProcessMediaHandler, GetAssetHandler, ListAssetsHandler],
  exports: [MediaEngineService],
})
export class MediaEngineModule {}
