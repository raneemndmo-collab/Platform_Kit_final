import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApilOrchestratorEntity } from '../../domain/entities/apil_orchestrator.entity';

@Injectable()
export class ApilOrchestratorRepository {
  constructor(@InjectRepository(ApilOrchestratorEntity, 'apil_orchestrator_connection') private readonly repo: Repository<ApilOrchestratorEntity>) {}

  async findByTenant(tenantId: string): Promise<ApilOrchestratorEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<ApilOrchestratorEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<ApilOrchestratorEntity>): Promise<ApilOrchestratorEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<ApilOrchestratorEntity>): Promise<ApilOrchestratorEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
