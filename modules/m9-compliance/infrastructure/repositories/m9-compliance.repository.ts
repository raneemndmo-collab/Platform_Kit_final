// m9-compliance — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ComplianceFramework } from '../../domain/entities';

@Injectable()
export class ComplianceFrameworkRepository {
  private readonly logger = new Logger(ComplianceFrameworkRepository.name);

  constructor(
    @InjectRepository(ComplianceFramework, 'm9_connection')
    private readonly repo: Repository<ComplianceFramework>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ComplianceFramework[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ComplianceFramework>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ComplianceFramework | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ComplianceFramework>,
    });
  }

  async create(tenantId: string, data: Partial<ComplianceFramework>): Promise<ComplianceFramework> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ComplianceFramework>): Promise<ComplianceFramework | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ComplianceFramework>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ComplianceFramework>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ComplianceFramework[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
