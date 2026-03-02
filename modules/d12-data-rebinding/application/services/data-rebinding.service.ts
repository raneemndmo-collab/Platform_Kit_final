// =============================================================================
// D12: Data Rebinding — Dynamic Data Source Rebinding
// Constitutional Reference: Part 22, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DataBinding {
  elementId: string;
  dataSource: string;
  field: string;
  format?: string;
  transform?: string;
  fallback?: string;
}

export interface RebindResult {
  cdrId: string;
  totalBindings: number;
  resolvedBindings: number;
  failedBindings: number;
  updatedElements: string[];
  errors: { elementId: string; error: string }[];
}

@Injectable()
export class DataRebindingService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(DataRebindingService.name);

  constructor(
    @InjectRepository('RebindJobEntity') private rebindRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async rebindData(tenantId: string, dto: {
    cdrId: string; bindings: DataBinding[]; dataContext: Record<string, unknown>;
  }): Promise<RebindResult> {
    const updatedElements: string[] = [];
    const errors: { elementId: string; error: string }[] = [];
    let resolved = 0;

    for (const binding of dto.bindings) {
      try {
        const value = this.resolveBinding(binding, dto.dataContext);
        if (value !== undefined) { updatedElements.push(binding.elementId); resolved++; }
        else { errors.push({ elementId: binding.elementId, error: `Field ${binding.field} not found in data source ${binding.dataSource}` }); }
      } catch (e) {
        errors.push({ elementId: binding.elementId, error: String(e) });
      }
    }

    const result: RebindResult = {
      cdrId: dto.cdrId, totalBindings: dto.bindings.length,
      resolvedBindings: resolved, failedBindings: errors.length,
      updatedElements, errors,
    };

    await this.rebindRepo.save({ tenantId, cdrId: dto.cdrId, resultJson: JSON.stringify(result), resolvedCount: resolved });
    return result;
  }

  private resolveBinding(binding: DataBinding, dataContext: Record<string, unknown>): unknown {
    const source = dataContext[binding.dataSource];
    if (!source) return binding.fallback;
    const value = source[binding.field];
    if (value === undefined) return binding.fallback;
    if (binding.transform) return this.applyTransform(value, binding.transform);
    if (binding.format) return this.applyFormat(value, binding.format);
    return value;
  }

  private applyTransform(value: unknown, transform: string): unknown {
    switch (transform) {
      case 'uppercase': return String(value).toUpperCase();
      case 'lowercase': return String(value).toLowerCase();
      case 'number': return Number(value);
      case 'date': return new Date(value).toISOString();
      default: return value;
    }
  }

  private applyFormat(value: unknown, format: string): string {
    if (format === 'currency') return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(Number(value));
    if (format === 'percentage') return `${(Number(value) * 100).toFixed(1)}%`;
    if (format === 'date') return new Intl.DateTimeFormat('ar-SA').format(new Date(value));
    return String(value);
  }
}