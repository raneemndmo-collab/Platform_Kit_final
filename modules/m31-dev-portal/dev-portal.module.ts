import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey, ApiDocumentation, SandboxEnvironment, ApiUsageStats } from './domain/entities';
import { DevPortalService } from './application/services/dev-portal.service';
import { DevPortalController } from './api/controllers/dev-portal.controller';
import { RegisterAppHandler } from './application/commands/register-app.handler';
import { GenerateKeyHandler } from './application/commands/generate-key.handler';
import { GetAppHandler } from './application/queries/get-app.handler';
import { ListAppsHandler } from './application/queries/list-apps.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ApiKey, ApiDocumentation, SandboxEnvironment, ApiUsageStats], 'm31_connection')],
  controllers: [DevPortalController],
  providers: [DevPortalService, RegisterAppHandler, GenerateKeyHandler, GetAppHandler, ListAppsHandler],
  exports: [DevPortalService],
})
export class DevPortalModule {}
