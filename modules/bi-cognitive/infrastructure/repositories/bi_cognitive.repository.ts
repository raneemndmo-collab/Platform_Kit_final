import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiCognitiveEntity } from '../../domain/entities/bi_cognitive.entity';

@Injectable()
export class BiCognitiveRepository {
  constructor(@InjectRepository(BiCognitiveEntity, 'bi_cognitive_connection') private readonly repo: Repository<BiCognitiveEntity>) {}

  async findByTenant(tenantId: string): Promise<BiCognitiveEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<BiCognitiveEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<BiCognitiveEntity>): Promise<BiCognitiveEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<BiCognitiveEntity>): Promise<BiCognitiveEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
