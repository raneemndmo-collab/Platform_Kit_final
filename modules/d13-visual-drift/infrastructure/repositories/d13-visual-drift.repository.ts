// d13-visual-drift — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { FidelityReport } from '../../domain/entities';

@Injectable()
export class FidelityReportRepository {
  private readonly logger = new Logger(FidelityReportRepository.name);

  constructor(
    @InjectRepository(FidelityReport, 'd13_connection')
    private readonly repo: Repository<FidelityReport>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[FidelityReport[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<FidelityReport>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<FidelityReport | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<FidelityReport>,
    });
  }

  async create(tenantId: string, data: Partial<FidelityReport>): Promise<FidelityReport> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<FidelityReport>): Promise<FidelityReport | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<FidelityReport>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<FidelityReport>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[FidelityReport[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
