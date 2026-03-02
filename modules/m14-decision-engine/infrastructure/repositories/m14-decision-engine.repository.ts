// m14-decision-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { DecisionRule } from '../../domain/entities';

@Injectable()
export class DecisionRuleRepository {
  private readonly logger = new Logger(DecisionRuleRepository.name);

  constructor(
    @InjectRepository(DecisionRule, 'm14_connection')
    private readonly repo: Repository<DecisionRule>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[DecisionRule[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<DecisionRule>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<DecisionRule | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<DecisionRule>,
    });
  }

  async create(tenantId: string, data: Partial<DecisionRule>): Promise<DecisionRule> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<DecisionRule>): Promise<DecisionRule | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<DecisionRule>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<DecisionRule>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[DecisionRule[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
