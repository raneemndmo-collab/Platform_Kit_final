// m11-ai-orchestration — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AIModel } from '../../domain/entities';

@Injectable()
export class AIModelRepository {
  private readonly logger = new Logger(AIModelRepository.name);

  constructor(
    @InjectRepository(AIModel, 'm11_connection')
    private readonly repo: Repository<AIModel>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[AIModel[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<AIModel>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AIModel | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<AIModel>,
    });
  }

  async create(tenantId: string, data: Partial<AIModel>): Promise<AIModel> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<AIModel>): Promise<AIModel | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<AIModel>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<AIModel>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[AIModel[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
