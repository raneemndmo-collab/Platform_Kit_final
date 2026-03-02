// d4-conversion-orchestrator — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConversionJob } from '../../domain/entities';

@Injectable()
export class ConversionJobRepository {
  private readonly logger = new Logger(ConversionJobRepository.name);

  constructor(
    @InjectRepository(ConversionJob, 'd4_connection')
    private readonly repo: Repository<ConversionJob>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ConversionJob[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ConversionJob>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ConversionJob | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ConversionJob>,
    });
  }

  async create(tenantId: string, data: Partial<ConversionJob>): Promise<ConversionJob> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ConversionJob>): Promise<ConversionJob | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ConversionJob>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ConversionJob>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ConversionJob[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
