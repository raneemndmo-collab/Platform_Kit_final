import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalPage, PortalTheme, PortalMenu } from './domain/entities';
import { PortalService } from './application/services/portal.service';
import { PortalController } from './api/controllers/portal.controller';
import { CreatePageHandler } from './application/commands/create-page.handler';
import { PublishPageHandler } from './application/commands/publish-page.handler';
import { GetPageHandler } from './application/queries/get-page.handler';
import { ListPagesHandler } from './application/queries/list-pages.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([PortalPage, PortalTheme, PortalMenu], 'm19_connection')],
  controllers: [PortalController],
  providers: [PortalService, CreatePageHandler, PublishPageHandler, GetPageHandler, ListPagesHandler],
  exports: [PortalService],
})
export class PortalModule {}
