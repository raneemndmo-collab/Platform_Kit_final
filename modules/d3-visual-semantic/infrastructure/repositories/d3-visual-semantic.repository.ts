// d3-visual-semantic — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { SemanticNode } from '../../domain/entities';

@Injectable()
export class SemanticNodeRepository {
  private readonly logger = new Logger(SemanticNodeRepository.name);

  constructor(
    @InjectRepository(SemanticNode, 'd3_connection')
    private readonly repo: Repository<SemanticNode>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[SemanticNode[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<SemanticNode>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<SemanticNode | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<SemanticNode>,
    });
  }

  async create(tenantId: string, data: Partial<SemanticNode>): Promise<SemanticNode> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<SemanticNode>): Promise<SemanticNode | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<SemanticNode>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<SemanticNode>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[SemanticNode[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
