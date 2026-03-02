// d10-translation-direction — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { TranslationJob } from '../../domain/entities';

@Injectable()
export class TranslationJobRepository {
  private readonly logger = new Logger(TranslationJobRepository.name);

  constructor(
    @InjectRepository(TranslationJob, 'd10_connection')
    private readonly repo: Repository<TranslationJob>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[TranslationJob[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<TranslationJob>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TranslationJob | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<TranslationJob>,
    });
  }

  async create(tenantId: string, data: Partial<TranslationJob>): Promise<TranslationJob> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<TranslationJob>): Promise<TranslationJob | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<TranslationJob>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<TranslationJob>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[TranslationJob[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
