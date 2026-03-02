import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dashboard, DashboardWidget, RealtimeSubscription } from './domain/entities';
import { DashboardService } from './application/services/dashboard.service';
import { DashboardController } from './api/controllers/dashboard.controller';
import { CreateDashboardHandler } from './application/commands/create-dashboard.handler';
import { UpdateWidgetHandler } from './application/commands/update-widget.handler';
import { GetDashboardHandler } from './application/queries/get-dashboard.handler';
import { ListDashboardsHandler } from './application/queries/list-dashboards.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Dashboard, DashboardWidget, RealtimeSubscription], 'm18_connection')],
  controllers: [DashboardController],
  providers: [DashboardService, CreateDashboardHandler, UpdateWidgetHandler, GetDashboardHandler, ListDashboardsHandler],
  exports: [DashboardService],
})
export class DashboardModule {}
