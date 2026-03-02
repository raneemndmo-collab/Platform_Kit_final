// m19-portal — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { PortalPage } from '../../domain/entities';

@Injectable()
export class PortalPageRepository {
  private readonly logger = new Logger(PortalPageRepository.name);

  constructor(
    @InjectRepository(PortalPage, 'm19_connection')
    private readonly repo: Repository<PortalPage>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[PortalPage[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<PortalPage>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<PortalPage | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<PortalPage>,
    });
  }

  async create(tenantId: string, data: Partial<PortalPage>): Promise<PortalPage> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<PortalPage>): Promise<PortalPage | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<PortalPage>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<PortalPage>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[PortalPage[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
