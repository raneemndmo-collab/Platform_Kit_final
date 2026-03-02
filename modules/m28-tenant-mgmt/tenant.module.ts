import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant, TenantDatabase, TenantUsage, TenantIsolationTest } from './domain/entities';
import { TenantService } from './application/services/tenant.service';
import { TenantController } from './api/controllers/tenant.controller';
import { CreateTenantHandler } from './application/commands/create-tenant.handler';
import { SuspendTenantHandler } from './application/commands/suspend-tenant.handler';
import { GetTenantHandler } from './application/queries/get-tenant.handler';
import { ListTenantsHandler } from './application/queries/list-tenants.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Tenant, TenantDatabase, TenantUsage, TenantIsolationTest], 'm28_connection')],
  controllers: [TenantController],
  providers: [TenantService, CreateTenantHandler, SuspendTenantHandler, GetTenantHandler, ListTenantsHandler],
  exports: [TenantService],
})
export class TenantModule {}
