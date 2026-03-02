import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataIntelligenceEntity } from '../../domain/entities/data_intelligence.entity';

@Injectable()
export class DataIntelligenceRepository {
  constructor(@InjectRepository(DataIntelligenceEntity, 'data_intelligence_connection') private readonly repo: Repository<DataIntelligenceEntity>) {}

  async findByTenant(tenantId: string): Promise<DataIntelligenceEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<DataIntelligenceEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<DataIntelligenceEntity>): Promise<DataIntelligenceEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<DataIntelligenceEntity>): Promise<DataIntelligenceEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
