// m31-dev-portal — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ApiKey } from '../../domain/entities';

@Injectable()
export class ApiKeyRepository {
  private readonly logger = new Logger(ApiKeyRepository.name);

  constructor(
    @InjectRepository(ApiKey, 'm31_connection')
    private readonly repo: Repository<ApiKey>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ApiKey[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ApiKey>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ApiKey | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ApiKey>,
    });
  }

  async create(tenantId: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ApiKey>): Promise<ApiKey | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ApiKey>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ApiKey>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ApiKey[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
