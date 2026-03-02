// m4-inventory — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ItemEntity } from '../../domain/entities';

@Injectable()
export class ItemRepository {
  private readonly logger = new Logger(ItemRepository.name);

  constructor(
    @InjectRepository(ItemEntity, 'm4_connection')
    private readonly repo: Repository<ItemEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ItemEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ItemEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ItemEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ItemEntity>,
    });
  }

  async create(tenantId: string, data: Partial<ItemEntity>): Promise<ItemEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ItemEntity>): Promise<ItemEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ItemEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ItemEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ItemEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
