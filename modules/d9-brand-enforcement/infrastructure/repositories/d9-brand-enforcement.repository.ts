// d9-brand-enforcement — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { BrandPack } from '../../domain/entities';

@Injectable()
export class BrandPackRepository {
  private readonly logger = new Logger(BrandPackRepository.name);

  constructor(
    @InjectRepository(BrandPack, 'd9_connection')
    private readonly repo: Repository<BrandPack>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[BrandPack[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<BrandPack>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<BrandPack | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<BrandPack>,
    });
  }

  async create(tenantId: string, data: Partial<BrandPack>): Promise<BrandPack> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<BrandPack>): Promise<BrandPack | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<BrandPack>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<BrandPack>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[BrandPack[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
