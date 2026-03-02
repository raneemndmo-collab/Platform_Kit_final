import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceIntelligenceEntity } from '../../domain/entities/performance_intelligence.entity';

@Injectable()
export class PerformanceIntelligenceRepository {
  constructor(@InjectRepository(PerformanceIntelligenceEntity, 'performance_intelligence_connection') private readonly repo: Repository<PerformanceIntelligenceEntity>) {}

  async findByTenant(tenantId: string): Promise<PerformanceIntelligenceEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<PerformanceIntelligenceEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<PerformanceIntelligenceEntity>): Promise<PerformanceIntelligenceEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<PerformanceIntelligenceEntity>): Promise<PerformanceIntelligenceEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
