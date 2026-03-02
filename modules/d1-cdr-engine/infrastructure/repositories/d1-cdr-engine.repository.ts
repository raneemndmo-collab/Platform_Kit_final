// d1-cdr-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CDRDocument } from '../../domain/entities';

@Injectable()
export class CDRDocumentRepository {
  private readonly logger = new Logger(CDRDocumentRepository.name);

  constructor(
    @InjectRepository(CDRDocument, 'd1_connection')
    private readonly repo: Repository<CDRDocument>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[CDRDocument[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<CDRDocument>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<CDRDocument | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<CDRDocument>,
    });
  }

  async create(tenantId: string, data: Partial<CDRDocument>): Promise<CDRDocument> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<CDRDocument>): Promise<CDRDocument | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<CDRDocument>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<CDRDocument>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[CDRDocument[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
