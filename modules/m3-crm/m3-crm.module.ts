import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M3CrmController } from './api/controllers/crm.controller';
import { M3CrmService } from './application/handlers/crm.service';
import { ContactEntity, LeadEntity, OpportunityEntity, ActivityEntity, CampaignEntity, SegmentEntity } from './domain/entities';
import { UpdateCustomerHandler } from './application/commands/update-customer.handler';
import { CreateCustomerHandler } from './application/commands/create-customer.handler';
import { ListCustomersHandler } from './application/queries/list-customers.handler';
import { GetCustomerHandler } from './application/queries/get-customer.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ContactEntity, LeadEntity, OpportunityEntity, ActivityEntity, CampaignEntity, SegmentEntity], 'm3_connection')],
  controllers: [M3CrmController],
  providers: [M3CrmService, UpdateCustomerHandler, CreateCustomerHandler, ListCustomersHandler, GetCustomerHandler],
  exports: [M3CrmService],
})
export class M3CrmModule {}
