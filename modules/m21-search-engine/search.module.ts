import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchIndex, SearchDocument, SearchAnalytics } from './domain/entities';
import { SearchService } from './application/services/search.service';
import { SearchController } from './api/controllers/search.controller';
import { ExecuteSearchHandler } from './application/commands/execute-search.handler';
import { UpdateIndexHandler } from './application/commands/update-index.handler';
import { SearchResultsHandler } from './application/queries/search-results.handler';
import { GetIndexHandler } from './application/queries/get-index.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([SearchIndex, SearchDocument, SearchAnalytics], 'm21_connection')],
  controllers: [SearchController],
  providers: [SearchService, ExecuteSearchHandler, UpdateIndexHandler, SearchResultsHandler, GetIndexHandler],
  exports: [SearchService],
})
export class SearchModule {}
