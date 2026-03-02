import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfographicEngineEntity } from '../../domain/entities/infographic_engine.entity';

@Injectable()
export class InfographicEngineRepository {
  constructor(@InjectRepository(InfographicEngineEntity, 'infographic_engine_connection') private readonly repo: Repository<InfographicEngineEntity>) {}

  async findByTenant(tenantId: string): Promise<InfographicEngineEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<InfographicEngineEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<InfographicEngineEntity>): Promise<InfographicEngineEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<InfographicEngineEntity>): Promise<InfographicEngineEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
