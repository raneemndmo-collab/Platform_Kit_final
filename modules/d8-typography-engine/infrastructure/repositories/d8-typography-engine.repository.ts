// d8-typography-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { FontFamily } from '../../domain/entities';

@Injectable()
export class FontFamilyRepository {
  private readonly logger = new Logger(FontFamilyRepository.name);

  constructor(
    @InjectRepository(FontFamily, 'd8_connection')
    private readonly repo: Repository<FontFamily>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[FontFamily[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<FontFamily>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<FontFamily | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<FontFamily>,
    });
  }

  async create(tenantId: string, data: Partial<FontFamily>): Promise<FontFamily> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<FontFamily>): Promise<FontFamily | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<FontFamily>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<FontFamily>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[FontFamily[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
