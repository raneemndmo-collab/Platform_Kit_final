// d11-design-constraint — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConstraintRule } from '../../domain/entities';

@Injectable()
export class ConstraintRuleRepository {
  private readonly logger = new Logger(ConstraintRuleRepository.name);

  constructor(
    @InjectRepository(ConstraintRule, 'd11_connection')
    private readonly repo: Repository<ConstraintRule>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ConstraintRule[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ConstraintRule>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ConstraintRule | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ConstraintRule>,
    });
  }

  async create(tenantId: string, data: Partial<ConstraintRule>): Promise<ConstraintRule> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ConstraintRule>): Promise<ConstraintRule | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ConstraintRule>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ConstraintRule>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ConstraintRule[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
