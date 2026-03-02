// d5-rendering-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { RenderJob } from '../../domain/entities';

@Injectable()
export class RenderJobRepository {
  private readonly logger = new Logger(RenderJobRepository.name);

  constructor(
    @InjectRepository(RenderJob, 'd5_connection')
    private readonly repo: Repository<RenderJob>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[RenderJob[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<RenderJob>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<RenderJob | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<RenderJob>,
    });
  }

  async create(tenantId: string, data: Partial<RenderJob>): Promise<RenderJob> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<RenderJob>): Promise<RenderJob | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<RenderJob>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<RenderJob>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[RenderJob[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
