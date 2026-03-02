// M10: Legal Contract Management - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Contract, ContractClause, ContractObligation, ClauseTemplate, ContractAmendment } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LegalContractService {
  private readonly logger = new Logger(LegalContractService.name);

  constructor(
    @InjectRepository(Contract, 'm10_connection') private contractRepo: Repository<Contract>,
    @InjectRepository(ContractClause, 'm10_connection') private clauseRepo: Repository<ContractClause>,
    @InjectRepository(ContractObligation, 'm10_connection') private obligationRepo: Repository<ContractObligation>,
    @InjectRepository(ClauseTemplate, 'm10_connection') private clauseLibRepo: Repository<ClauseTemplate>,
    @InjectRepository(ContractAmendment, 'm10_connection') private amendRepo: Repository<ContractAmendment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Contracts ===
  async createContract(tenantId: string, data: {
    title: string; contractType: string; counterpartyName: string;
    totalValue?: number; currency?: string; effectiveDate?: Date;
    expirationDate?: Date; autoRenew?: boolean; ownerId: string;
  }): Promise<Contract> {
    const count = await this.contractRepo.count({ where: { tenantId } });
    const contractNumber = `CTR-${String(count + 1).padStart(5, '0')}`;
    const contract = await this.contractRepo.save(this.contractRepo.create({ tenantId, contractNumber, ...data }));
    this.safeEmit('contract.created', { tenantId, contractId: contract.id, title: data.title });
    return contract;
  }

  async updateContractStatus(tenantId: string, contractId: string, status: string): Promise<Contract> {
    const validTransitions: Record<string, string[]> = {
      draft: ['review'], review: ['negotiation', 'draft'], negotiation: ['pending_signature', 'draft'],
      pending_signature: ['active', 'draft'], active: ['expired', 'terminated', 'renewed'],
    };
    const contract = await this.contractRepo.findOneOrFail({ where: { id: contractId, tenantId } });
    if (!validTransitions[contract.status]?.includes(status))
      throw new BadRequestException(`Invalid transition from ${contract.status} to ${status}`);

    await this.contractRepo.update({ id: contractId, tenantId }, { status });
    this.safeEmit(`contract.${status}`, { tenantId, contractId, title: contract.title });
    return this.contractRepo.findOneOrFail({ where: { id: contractId, tenantId } });
  }

  async getContract(tenantId: string, id: string): Promise<Contract> {
    return this.contractRepo.findOneOrFail({ where: { id, tenantId } });
  }

  async listContracts(tenantId: string, status?: string, contractType?: string): Promise<Contract[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (contractType) where.contractType = contractType;
    return this.contractRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // === Clauses ===
  async addClause(tenantId: string, contractId: string, data: {
    clauseNumber: string; title: string; content: string; category: string; riskLevel?: string;
  }): Promise<ContractClause> {
    return this.clauseRepo.save(this.clauseRepo.create({ tenantId, contractId, ...data }));
  }

  async listClauses(tenantId: string, contractId: string): Promise<ContractClause[]> {
    return this.clauseRepo.find({ where: { tenantId, contractId }, order: { clauseNumber: 'ASC' } });
  }

  // === Obligations ===
  async addObligation(tenantId: string, contractId: string, data: {
    title: string; obligationType: string; responsibleParty: string; dueDate?: Date; assigneeId?: string;
  }): Promise<ContractObligation> {
    const obligation = await this.obligationRepo.save(this.obligationRepo.create({ tenantId, contractId, ...data }));
    this.safeEmit('contract.obligation.created', { tenantId, contractId, obligationId: obligation.id });
    return obligation;
  }

  async fulfillObligation(tenantId: string, obligationId: string): Promise<void> {
    await this.obligationRepo.update({ id: obligationId, tenantId }, { status: 'fulfilled' });
    this.safeEmit('contract.obligation.fulfilled', { tenantId, obligationId });
  }

  async getUpcomingObligations(tenantId: string, days: number = 30): Promise<ContractObligation[]> {
    const deadline = new Date(); deadline.setDate(deadline.getDate() + days);
    return this.obligationRepo.find({
      where: { tenantId, status: 'pending', dueDate: LessThanOrEqual(deadline) },
      order: { dueDate: 'ASC' },
    });
  }

  // === Renewals ===
  async getExpiringContracts(tenantId: string, days: number = 90): Promise<Contract[]> {
    const deadline = new Date(); deadline.setDate(deadline.getDate() + days);
    return this.contractRepo.find({
      where: { tenantId, status: 'active', expirationDate: LessThanOrEqual(deadline) },
      order: { expirationDate: 'ASC' },
    });
  }

  // === Clause Library ===
  async addClauseTemplate(tenantId: string, data: { title: string; category: string; content: string; jurisdiction?: string }): Promise<ClauseTemplate> {
    return this.clauseLibRepo.save(this.clauseLibRepo.create({ tenantId, ...data }));
  }

  async searchClauseLibrary(tenantId: string, category?: string): Promise<ClauseTemplate[]> {
    const where: Record<string, unknown> = { tenantId, isApproved: true };
    if (category) where.category = category;
    return this.clauseLibRepo.find({ where });
  }

  // === Amendments ===
  async createAmendment(tenantId: string, contractId: string, data: {
    title: string; description: string; effectiveDate: Date;
  }): Promise<ContractAmendment> {
    const count = await this.amendRepo.count({ where: { tenantId, contractId } });
    const amendmentNumber = `AMD-${String(count + 1).padStart(3, '0')}`;
    return this.amendRepo.save(this.amendRepo.create({ tenantId, contractId, amendmentNumber, ...data }));
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.contractRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
