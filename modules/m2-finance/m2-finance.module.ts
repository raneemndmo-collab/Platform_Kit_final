import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M2FinanceController } from './api/controllers/finance.controller';
import { M2FinanceService } from './application/handlers/finance.service';
import { AccountEntity, LedgerEntryEntity, InvoiceEntity, PaymentEntity, BudgetEntity, TaxRecordEntity } from './domain/entities';
import { CreateAccountHandler } from './application/commands/create-account.handler';
import { ProcessTransactionHandler } from './application/commands/process-transaction.handler';
import { GetAccountHandler } from './application/queries/get-account.handler';
import { ListTransactionsHandler } from './application/queries/list-transactions.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([AccountEntity, LedgerEntryEntity, InvoiceEntity, PaymentEntity, BudgetEntity, TaxRecordEntity], 'm2_connection')],
  controllers: [M2FinanceController],
  providers: [M2FinanceService, CreateAccountHandler, ProcessTransactionHandler, GetAccountHandler, ListTransactionsHandler],
  exports: [M2FinanceService],
})
export class M2FinanceModule {}
