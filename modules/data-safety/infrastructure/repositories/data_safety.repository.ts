import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSafetyEntity } from '../../domain/entities/data_safety.entity';

@Injectable()
export class DataSafetyRepository {
  constructor(@InjectRepository(DataSafetyEntity, 'data_safety_connection') private readonly repo: Repository<DataSafetyEntity>) {}

  async findByTenant(tenantId: string): Promise<DataSafetyEntity[]> { return this.repo.find({ where: { tenantId } }); }
  async findOne(id: string, tenantId: string): Promise<DataSafetyEntity | null> { return this.repo.findOne({ where: { id, tenantId } }); }
  async create(data: Partial<DataSafetyEntity>): Promise<DataSafetyEntity> { return this.repo.save(this.repo.create(data)); }
  async update(id: string, tenantId: string, data: Partial<DataSafetyEntity>): Promise<DataSafetyEntity | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findOne(id, tenantId);
  }
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected || 0) > 0;
  }
}
