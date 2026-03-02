// m15-knowledge-graph — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { KGNode } from '../../domain/entities';

@Injectable()
export class KGNodeRepository {
  private readonly logger = new Logger(KGNodeRepository.name);

  constructor(
    @InjectRepository(KGNode, 'm15_connection')
    private readonly repo: Repository<KGNode>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[KGNode[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<KGNode>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<KGNode | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<KGNode>,
    });
  }

  async create(tenantId: string, data: Partial<KGNode>): Promise<KGNode> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<KGNode>): Promise<KGNode | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<KGNode>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<KGNode>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[KGNode[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
