// m16-nlp — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { NLPTask } from '../../domain/entities';

@Injectable()
export class NLPTaskRepository {
  private readonly logger = new Logger(NLPTaskRepository.name);

  constructor(
    @InjectRepository(NLPTask, 'm16_connection')
    private readonly repo: Repository<NLPTask>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[NLPTask[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<NLPTask>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<NLPTask | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<NLPTask>,
    });
  }

  async create(tenantId: string, data: Partial<NLPTask>): Promise<NLPTask> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<NLPTask>): Promise<NLPTask | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<NLPTask>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<NLPTask>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[NLPTask[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
