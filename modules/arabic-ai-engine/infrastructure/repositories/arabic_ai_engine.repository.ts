import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArabicAiEngineEntity } from '../../domain/entities/arabic_ai_engine.entity';

@Injectable()
export class ArabicAiEngineRepository {
  constructor(@InjectRepository(ArabicAiEngineEntity, 'arabic_ai_engine_connection') private readonly repo: Repository<ArabicAiEngineEntity>) {}

  async findByTenant(tenantId: string): Promise<ArabicAiEngineEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<ArabicAiEngineEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<ArabicAiEngineEntity>): Promise<ArabicAiEngineEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<ArabicAiEngineEntity>): Promise<ArabicAiEngineEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
