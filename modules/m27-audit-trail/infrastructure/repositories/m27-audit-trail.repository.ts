// m27-audit-trail — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AuditEntry } from '../../domain/entities';

@Injectable()
export class AuditEntryRepository {
  private readonly logger = new Logger(AuditEntryRepository.name);

  constructor(
    @InjectRepository(AuditEntry, 'm27_connection')
    private readonly repo: Repository<AuditEntry>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[AuditEntry[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<AuditEntry>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AuditEntry | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<AuditEntry>,
    });
  }

  async create(tenantId: string, data: Partial<AuditEntry>): Promise<AuditEntry> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<AuditEntry>): Promise<AuditEntry | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<AuditEntry>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<AuditEntry>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[AuditEntry[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
