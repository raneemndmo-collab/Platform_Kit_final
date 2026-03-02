// m13-reporting — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ReportDefinition } from '../../domain/entities';

@Injectable()
export class ReportDefinitionRepository {
  private readonly logger = new Logger(ReportDefinitionRepository.name);

  constructor(
    @InjectRepository(ReportDefinition, 'm13_connection')
    private readonly repo: Repository<ReportDefinition>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ReportDefinition[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ReportDefinition>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ReportDefinition | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ReportDefinition>,
    });
  }

  async create(tenantId: string, data: Partial<ReportDefinition>): Promise<ReportDefinition> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ReportDefinition>): Promise<ReportDefinition | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ReportDefinition>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ReportDefinition>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ReportDefinition[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
