// d2-layout-graph — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { LayoutGrid } from '../../domain/entities';

@Injectable()
export class LayoutGridRepository {
  private readonly logger = new Logger(LayoutGridRepository.name);

  constructor(
    @InjectRepository(LayoutGrid, 'd2_connection')
    private readonly repo: Repository<LayoutGrid>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[LayoutGrid[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<LayoutGrid>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<LayoutGrid | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<LayoutGrid>,
    });
  }

  async create(tenantId: string, data: Partial<LayoutGrid>): Promise<LayoutGrid> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<LayoutGrid>): Promise<LayoutGrid | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<LayoutGrid>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<LayoutGrid>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[LayoutGrid[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
