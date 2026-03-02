// m29-billing — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { BillingPlan } from '../../domain/entities';

@Injectable()
export class BillingPlanRepository {
  private readonly logger = new Logger(BillingPlanRepository.name);

  constructor(
    @InjectRepository(BillingPlan, 'm29_connection')
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[BillingPlan[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<BillingPlan>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<BillingPlan | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<BillingPlan>,
    });
  }

  async create(tenantId: string, data: Partial<BillingPlan>): Promise<BillingPlan> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<BillingPlan>): Promise<BillingPlan | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<BillingPlan>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<BillingPlan>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[BillingPlan[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
