import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationAdapter, IntegrationFlow, IntegrationLog, WebhookEndpoint } from './domain/entities';
import { IntegrationService } from './application/services/integration.service';
import { IntegrationController } from './api/controllers/integration.controller';
import { CreateIntegrationHandler } from './application/commands/create-integration.handler';
import { ProcessWebhookHandler } from './application/commands/process-webhook.handler';
import { ListIntegrationsHandler } from './application/queries/list-integrations.handler';
import { GetIntegrationHandler } from './application/queries/get-integration.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([IntegrationAdapter, IntegrationFlow, IntegrationLog, WebhookEndpoint], 'm24_connection')],
  controllers: [IntegrationController],
  providers: [IntegrationService, CreateIntegrationHandler, ProcessWebhookHandler, ListIntegrationsHandler, GetIntegrationHandler],
  exports: [IntegrationService],
})
export class IntegrationModule {}
