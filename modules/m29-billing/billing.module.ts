import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPlan, Invoice, Payment, UsageRecord } from './domain/entities';
import { BillingService } from './application/services/billing.service';
import { BillingController } from './api/controllers/billing.controller';
import { ProcessPaymentHandler } from './application/commands/process-payment.handler';
import { CreateSubscriptionHandler } from './application/commands/create-subscription.handler';
import { ListInvoicesHandler } from './application/queries/list-invoices.handler';
import { GetSubscriptionHandler } from './application/queries/get-subscription.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([BillingPlan, Invoice, Payment, UsageRecord], 'm29_connection')],
  controllers: [BillingController],
  providers: [BillingService, ProcessPaymentHandler, CreateSubscriptionHandler, ListInvoicesHandler, GetSubscriptionHandler],
  exports: [BillingService],
})
export class BillingModule {}
