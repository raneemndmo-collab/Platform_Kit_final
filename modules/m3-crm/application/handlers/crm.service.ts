// =============================================================================
// M3: CRM — Application Service
// Commands: CreateLead, ConvertLead, CreateOpportunity, UpdateStage, LogActivity
// Queries: GetPipeline, GetContact, SearchContacts, GetSegment
// Events: crm.lead.created/converted, crm.opportunity.won/lost, crm.activity.logged
// Subscribes: finance.invoice.paid (customer payment status)
// =============================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ContactEntity, LeadEntity, OpportunityEntity, ActivityEntity, CampaignEntity, SegmentEntity } from '../../domain/entities';

@Injectable()
export class M3CrmService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M3CrmService.name);

  constructor(
    @InjectRepository(ContactEntity, 'm3_connection') private readonly contactRepo: Repository<ContactEntity>,
    @InjectRepository(LeadEntity, 'm3_connection') private readonly leadRepo: Repository<LeadEntity>,
    @InjectRepository(OpportunityEntity, 'm3_connection') private readonly oppRepo: Repository<OpportunityEntity>,
    @InjectRepository(ActivityEntity, 'm3_connection') private readonly activityRepo: Repository<ActivityEntity>,
    @InjectRepository(CampaignEntity, 'm3_connection') private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(SegmentEntity, 'm3_connection') private readonly segmentRepo: Repository<SegmentEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== Contacts ====================

  async createContact(tenantId: string, userId: string, dto: Partial<ContactEntity>): Promise<ContactEntity> {
    const contact = this.contactRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.contactRepo.save(contact);
  }

  async getContact(tenantId: string, contactId: string): Promise<ContactEntity> {
    const c = await this.contactRepo.findOne({ where: { id: contactId, tenantId } });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  async searchContacts(tenantId: string, query: string): Promise<ContactEntity[]> {
    return this.contactRepo.find({
      where: [
        { tenantId, firstName: Like(`%${query}%`) },
        { tenantId, lastName: Like(`%${query}%`) },
        { tenantId, email: Like(`%${query}%`) },
        { tenantId, company: Like(`%${query}%`) },
      ],
      take: 50,
    });
  }

  // ==================== Leads ====================

  async createLead(tenantId: string, userId: string, dto: Partial<LeadEntity>): Promise<LeadEntity> {
    const lead = this.leadRepo.create({ ...dto, tenantId, createdBy: userId, status: dto.status || 'new' });
    const saved = await this.leadRepo.save(lead);

    this.safeEmit('crm.lead.created', {
      tenantId, leadId: saved.id, source: saved.source, timestamp: new Date(),
    });
    return saved;
  }

  async convertLead(tenantId: string, userId: string, leadId: string, dto: {
    opportunityName: string; value: number; expectedCloseDate?: string;
  }): Promise<{ lead: LeadEntity; opportunity: OpportunityEntity }> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === 'converted') throw new BadRequestException('Lead already converted');

    // Create opportunity from lead
    const opportunity = this.oppRepo.create({
      tenantId, createdBy: userId, name: dto.opportunityName,
      contactId: lead.contactId, leadId: lead.id,
      stage: 'qualification', value: dto.value,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
      assignedTo: lead.assignedTo, probability: 30,
    });
    const savedOpp = await this.oppRepo.save(opportunity);

    // Update lead
    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedOpportunityId = savedOpp.id;
    const savedLead = await this.leadRepo.save(lead);

    this.safeEmit('crm.lead.converted', {
      tenantId, leadId: savedLead.id, opportunityId: savedOpp.id, timestamp: new Date(),
    });

    return { lead: savedLead, opportunity: savedOpp };
  }

  // ==================== Opportunities ====================

  async createOpportunity(tenantId: string, userId: string, dto: Partial<OpportunityEntity>): Promise<OpportunityEntity> {
    const opp = this.oppRepo.create({ ...dto, tenantId, createdBy: userId, stage: dto.stage || 'prospecting' });
    return this.oppRepo.save(opp);
  }

  async updateStage(tenantId: string, userId: string, oppId: string, stage: string): Promise<OpportunityEntity> {
    const opp = await this.oppRepo.findOne({ where: { id: oppId, tenantId } });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const previousStage = opp.stage;
    opp.stage = stage;
    opp.updatedBy = userId;

    // Update probability based on stage
    const stageProbability: Record<string, number> = {
      prospecting: 10, qualification: 30, proposal: 50,
      negotiation: 70, closed_won: 100, closed_lost: 0,
    };
    opp.probability = stageProbability[stage] ?? opp.probability;

    const saved = await this.oppRepo.save(opp);

    if (stage === 'closed_won') {
      this.safeEmit('crm.opportunity.won', {
        tenantId, opportunityId: saved.id, value: saved.value,
        contactId: saved.contactId, timestamp: new Date(),
      });
    } else if (stage === 'closed_lost') {
      this.safeEmit('crm.opportunity.lost', {
        tenantId, opportunityId: saved.id, value: saved.value,
        reason: saved.lostReason, timestamp: new Date(),
      });
    }

    return saved;
  }

  async getPipeline(tenantId: string): Promise<Record<string, OpportunityEntity[]>> {
    const opps = await this.oppRepo.find({
      where: { tenantId },
      order: { value: 'DESC' },
    });

    const pipeline: Record<string, OpportunityEntity[]> = {};
    for (const opp of opps) {
      if (!pipeline[opp.stage]) pipeline[opp.stage] = [];
      pipeline[opp.stage].push(opp);
    }
    return pipeline;
  }

  // ==================== Activities ====================

  async logActivity(tenantId: string, userId: string, dto: Partial<ActivityEntity>): Promise<ActivityEntity> {
    const activity = this.activityRepo.create({
      ...dto, tenantId, createdBy: userId, performedBy: userId,
      activityDate: dto.activityDate || new Date(),
    });
    const saved = await this.activityRepo.save(activity);

    this.safeEmit('crm.activity.logged', {
      tenantId, activityId: saved.id, contactId: saved.contactId,
      type: saved.type, timestamp: new Date(),
    });
    return saved;
  }

  async getActivities(tenantId: string, contactId: string): Promise<ActivityEntity[]> {
    return this.activityRepo.find({
      where: { tenantId, contactId },
      order: { activityDate: 'DESC' },
    });
  }

  // ==================== Campaigns & Segments ====================

  async createCampaign(tenantId: string, userId: string, dto: Partial<CampaignEntity>): Promise<CampaignEntity> {
    const campaign = this.campaignRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.campaignRepo.save(campaign);
  }

  async getCampaigns(tenantId: string): Promise<CampaignEntity[]> {
    return this.campaignRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async createSegment(tenantId: string, userId: string, dto: Partial<SegmentEntity>): Promise<SegmentEntity> {
    const segment = this.segmentRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.segmentRepo.save(segment);
  }

  async getSegment(tenantId: string, segmentId: string): Promise<SegmentEntity> {
    const s = await this.segmentRepo.findOne({ where: { id: segmentId, tenantId } });
    if (!s) throw new NotFoundException('Segment not found');
    return s;
  }

  // ==================== Event Subscribers (COM-001) ====================

  @OnEvent('finance.invoice.paid')
  async handleInvoicePaid(event: unknown): Promise<void> {
    this.logger.log(`CRM received payment event for customer: ${event.customerId}`);
    // Update customer payment status in CRM
  }
}
