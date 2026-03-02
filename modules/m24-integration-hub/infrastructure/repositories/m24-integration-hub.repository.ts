// m24-integration-hub — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { IntegrationAdapter } from '../../domain/entities';

@Injectable()
export class IntegrationAdapterRepository {
  private readonly logger = new Logger(IntegrationAdapterRepository.name);

  constructor(
    @InjectRepository(IntegrationAdapter, 'm24_connection')
    private readonly repo: Repository<IntegrationAdapter>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[IntegrationAdapter[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<IntegrationAdapter>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<IntegrationAdapter | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<IntegrationAdapter>,
    });
  }

  async create(tenantId: string, data: Partial<IntegrationAdapter>): Promise<IntegrationAdapter> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<IntegrationAdapter>): Promise<IntegrationAdapter | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<IntegrationAdapter>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<IntegrationAdapter>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[IntegrationAdapter[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
