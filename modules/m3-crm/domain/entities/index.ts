// =============================================================================
// M3: CRM — Domain Entities
// Entities: Contact, Lead, Opportunity, Activity, Campaign, Segment
// Database: crm_db. FORBIDDEN: access to finance_db, hrm_db.
// FORBIDDEN: Embedding sales commission logic (belongs to M2).
// =============================================================================

import { Entity, Column, Index } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('contacts')
export class ContactEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ nullable: true }) @Index() email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) company: string;
  @Column({ nullable: true }) jobTitle: string;
  @Column({ nullable: true }) industry: string;
  @Column({ default: 'active' }) @Index() status: string; // active, inactive, archived
  @Column({ nullable: true }) source: string; // website, referral, event, cold_call
  @Column({ type: 'jsonb', nullable: true }) address: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) customFields: Record<string, unknown>;
  @Column({ type: 'simple-array', nullable: true }) tags: string[];
  @Column({ nullable: true }) assignedTo: string;
}

@Entity('leads')
export class LeadEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column({ nullable: true }) contactId: string;
  @Column() @Index() source: string;
  @Column() @Index() status: string; // new, contacted, qualified, unqualified, converted
  @Column({ nullable: true }) score: number; // 0-100 lead score
  @Column({ nullable: true }) assignedTo: string;
  @Column({ nullable: true }) company: string;
  @Column({ nullable: true }) estimatedValue: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) convertedAt: Date;
  @Column({ nullable: true }) convertedOpportunityId: string;
}

@Entity('opportunities')
export class OpportunityEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column({ nullable: true }) @Index() contactId: string;
  @Column({ nullable: true }) leadId: string;
  @Column() @Index() stage: string; // prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  @Column({ type: 'decimal', precision: 15, scale: 2 }) value: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ type: 'int', default: 0 }) probability: number; // 0-100
  @Column({ type: 'date', nullable: true }) expectedCloseDate: Date;
  @Column({ nullable: true }) assignedTo: string;
  @Column({ nullable: true }) lostReason: string;
  @Column({ nullable: true }) notes: string;
  @Column({ type: 'jsonb', nullable: true }) products: Record<string, unknown>[];
}

@Entity('activities')
export class ActivityEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() contactId: string;
  @Column({ nullable: true }) opportunityId: string;
  @Column() type: string; // call, email, meeting, note, task
  @Column() subject: string;
  @Column({ nullable: true }) description: string;
  @Column() performedBy: string;
  @Column({ type: 'timestamp' }) activityDate: Date;
  @Column({ nullable: true }) duration: number; // minutes
  @Column({ nullable: true }) outcome: string;
  @Column({ default: 'completed' }) status: string;
}

@Entity('campaigns')
export class CampaignEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column() type: string; // email, social, event, ads
  @Column({ default: 'draft' }) @Index() status: string; // draft, active, paused, completed
  @Column({ type: 'date', nullable: true }) startDate: Date;
  @Column({ type: 'date', nullable: true }) endDate: Date;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) budget: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ default: 0 }) totalLeads: number;
  @Column({ default: 0 }) convertedLeads: number;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'simple-array', nullable: true }) targetSegments: string[];
}

@Entity('segments')
export class SegmentEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'jsonb' }) criteria: Record<string, unknown>; // Filter criteria for contacts
  @Column({ default: 0 }) contactCount: number;
  @Column({ default: true }) isDynamic: boolean;
  @Column({ nullable: true }) lastRefreshedAt: Date;
}

export { ContactEntity, LeadEntity, OpportunityEntity, ActivityEntity, CampaignEntity, SegmentEntity };
