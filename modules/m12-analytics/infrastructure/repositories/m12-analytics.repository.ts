// m12-analytics — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AnalyticsEvent } from '../../domain/entities';

@Injectable()
export class AnalyticsEventRepository {
  private readonly logger = new Logger(AnalyticsEventRepository.name);

  constructor(
    @InjectRepository(AnalyticsEvent, 'm12_connection')
    private readonly repo: Repository<AnalyticsEvent>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[AnalyticsEvent[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<AnalyticsEvent>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AnalyticsEvent | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<AnalyticsEvent>,
    });
  }

  async create(tenantId: string, data: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<AnalyticsEvent>): Promise<AnalyticsEvent | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<AnalyticsEvent>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<AnalyticsEvent>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[AnalyticsEvent[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
