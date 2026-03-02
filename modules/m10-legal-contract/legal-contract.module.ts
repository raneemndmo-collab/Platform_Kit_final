import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract, ContractClause, ContractObligation, ClauseTemplate, ContractAmendment } from './domain/entities';
import { LegalContractService } from './application/services/legal-contract.service';
import { LegalContractController } from './api/controllers/legal-contract.controller';
import { CreateContractHandler } from './application/commands/create-contract.handler';
import { SignContractHandler } from './application/commands/sign-contract.handler';
import { ListContractsHandler } from './application/queries/list-contracts.handler';
import { GetContractHandler } from './application/queries/get-contract.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Contract, ContractClause, ContractObligation, ClauseTemplate, ContractAmendment], 'm10_connection')],
  controllers: [LegalContractController],
  providers: [LegalContractService, CreateContractHandler, SignContractHandler, ListContractsHandler, GetContractHandler],
  exports: [LegalContractService],
})
export class LegalContractModule {}
