import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpreadsheetIntelligenceEntity } from '../../domain/entities/spreadsheet_intelligence.entity';

@Injectable()
export class SpreadsheetIntelligenceRepository {
  constructor(@InjectRepository(SpreadsheetIntelligenceEntity, 'spreadsheet_intelligence_connection') private readonly repo: Repository<SpreadsheetIntelligenceEntity>) {}

  async findByTenant(tenantId: string): Promise<SpreadsheetIntelligenceEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<SpreadsheetIntelligenceEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<SpreadsheetIntelligenceEntity>): Promise<SpreadsheetIntelligenceEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<SpreadsheetIntelligenceEntity>): Promise<SpreadsheetIntelligenceEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
