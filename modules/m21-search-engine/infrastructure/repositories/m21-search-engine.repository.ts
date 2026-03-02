// m21-search-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { SearchIndex } from '../../domain/entities';

@Injectable()
export class SearchIndexRepository {
  private readonly logger = new Logger(SearchIndexRepository.name);

  constructor(
    @InjectRepository(SearchIndex, 'm21_connection')
    private readonly repo: Repository<SearchIndex>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[SearchIndex[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<SearchIndex>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<SearchIndex | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<SearchIndex>,
    });
  }

  async create(tenantId: string, data: Partial<SearchIndex>): Promise<SearchIndex> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<SearchIndex>): Promise<SearchIndex | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<SearchIndex>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<SearchIndex>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[SearchIndex[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
