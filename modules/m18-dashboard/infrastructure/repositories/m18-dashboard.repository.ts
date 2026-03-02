// m18-dashboard — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Dashboard } from '../../domain/entities';

@Injectable()
export class DashboardRepository {
  private readonly logger = new Logger(DashboardRepository.name);

  constructor(
    @InjectRepository(Dashboard, 'm18_connection')
    private readonly repo: Repository<Dashboard>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[Dashboard[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<Dashboard>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Dashboard | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<Dashboard>,
    });
  }

  async create(tenantId: string, data: Partial<Dashboard>): Promise<Dashboard> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<Dashboard>): Promise<Dashboard | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<Dashboard>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<Dashboard>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[Dashboard[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
