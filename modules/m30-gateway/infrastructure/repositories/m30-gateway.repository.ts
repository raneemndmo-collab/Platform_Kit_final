// m30-gateway — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { RouteDefinitionEntity } from '../../domain/entities';

@Injectable()
export class RouteDefinitionRepository {
  private readonly logger = new Logger(RouteDefinitionRepository.name);

  constructor(
    @InjectRepository(RouteDefinitionEntity, 'm30_connection')
    private readonly repo: Repository<RouteDefinitionEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[RouteDefinitionEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<RouteDefinitionEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<RouteDefinitionEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<RouteDefinitionEntity>,
    });
  }

  async create(tenantId: string, data: Partial<RouteDefinitionEntity>): Promise<RouteDefinitionEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<RouteDefinitionEntity>): Promise<RouteDefinitionEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<RouteDefinitionEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<RouteDefinitionEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[RouteDefinitionEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
