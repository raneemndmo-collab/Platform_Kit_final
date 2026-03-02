// Rasid v6.4 — Decision Engine Service — M14
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DecisionService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(DecisionService.name);

  constructor(
    @InjectRepository(require('../../domain/entities/decision.entity').DecisionEntity, 'decision_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: { title: string; type: string; criteria: unknown[]; options: unknown[]; metadata?: unknown }) {
    const entity = this.repo.create({
      tenantId, title: dto.title, type: dto.type,
      criteria: dto.criteria, options: dto.options,
      status: 'draft', metadata: dto.metadata || {},
      scores: {}, recommendation: null,
    });
    const saved = await this.repo.save(entity);
    this.safeEmit('m14_decision.created', { tenantId, decisionId: saved.id, type: dto.type });
    this.logger.log(`Decision created: ref=${saved.id}`);
    return saved;
  }

  async evaluate(id: string, tenantId: string): Promise<unknown> {
    const decision = await this.repo.findOne({ where: { id, tenantId } });
    if (!decision) throw new NotFoundException(`Decision ${id} not found`);
    if (!decision.criteria?.length || !decision.options?.length) throw new Error('Criteria and options required');

    const scores: Record<string, number> = {};
    for (const option of decision.options) {
      let totalScore = 0, totalWeight = 0;
      for (const criterion of decision.criteria) {
        const weight = criterion.weight || 1;
        const rating = criterion.ratings?.[option.id] || 0;
        totalScore += weight * rating;
        totalWeight += weight;
      }
      scores[option.id] = totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const recommendation = sorted.length > 0 ? { optionId: sorted[0][0], score: sorted[0][1], confidence: this.computeConfidence(sorted) } : null;

    decision.scores = scores;
    decision.recommendation = recommendation;
    decision.status = 'evaluated';
    const saved = await this.repo.save(decision);
    this.safeEmit('m14_decision.evaluated', { tenantId, decisionId: id, recommendation });
    return saved;
  }

  async runSensitivityAnalysis(id: string, tenantId: string, criterionId: string, range: [number, number]): Promise<any[]> {
    const decision = await this.repo.findOne({ where: { id, tenantId } });
    if (!decision) throw new NotFoundException();
    const results: unknown[] = [];
    for (let w = range[0]; w <= range[1]; w += (range[1] - range[0]) / 10) {
      const modifiedCriteria = decision.criteria.map((c: unknown) => c.id === criterionId ? { ...c, weight: w } : c);
      const scores: Record<string, number> = {};
      for (const option of decision.options) {
        let total = 0, totalW = 0;
        for (const c of modifiedCriteria) { total += (c.weight || 1) * (c.ratings?.[option.id] || 0); totalW += c.weight || 1; }
        scores[option.id] = totalW > 0 ? total / totalW : 0;
      }
      const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      results.push({ weight: w, winner: winner?.[0], score: winner?.[1], allScores: scores });
    }
    return results;
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } }); }
  async findOne(id: string, tenantId: string) { return this.repo.findOne({ where: { id, tenantId } }); }
  async updateStatus(id: string, tenantId: string, status: string) {
    await this.repo.update({ id, tenantId }, { status });
    this.safeEmit('m14_decision.status_changed', { tenantId, decisionId: id, status });
    return this.findOne(id, tenantId);
  }

  private computeConfidence(sorted: [string, number][]): number {
    if (sorted.length < 2) return 1;
    const gap = sorted[0][1] - sorted[1][1];
    const max = sorted[0][1] || 1;
    return Math.min(0.99, 0.5 + (gap / max) * 0.5);
  }

  // Helper: evaluate a single rule against context
  private async evaluateRule(tenantId: string, ruleId: string, context: Record<string, unknown>): Promise<unknown> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId, tenantId } });
    if (!rule) return { ruleId, matched: false, reason: 'not_found' };
    // Evaluate conditions against context
    const conditions = (rule as Record<string, unknown>).conditions as Record<string, unknown>[] || [];
    const allMatch = Array.isArray(conditions) ? conditions.every((c: Record<string, unknown>) => {
      const field = c.field as string;
      const op = c.operator as string;
      const val = c.value;
      const actual = context[field];
      if (op === 'eq') return actual === val;
      if (op === 'gt') return (actual as number) > (val as number);
      if (op === 'lt') return (actual as number) < (val as number);
      if (op === 'contains') return String(actual).includes(String(val));
      return false;
    }) : true;
    return { ruleId, matched: allMatch, actions: allMatch ? (rule as Record<string, unknown>).actions : [] };
  }

  // A8 FIX: Parallel rule evaluation
  async evaluateRulesBatch(tenantId: string, ruleIds: string[], context: Record<string, unknown>): Promise<unknown[]> {
    return Promise.all(ruleIds.map(id => this.evaluateRule(tenantId, id, context)));
  }
}
