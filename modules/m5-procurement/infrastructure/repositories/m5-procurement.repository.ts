// m5-procurement — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { VendorEntity } from '../../domain/entities';

@Injectable()
export class VendorRepository {
  private readonly logger = new Logger(VendorRepository.name);

  constructor(
    @InjectRepository(VendorEntity, 'm5_connection')
    private readonly repo: Repository<VendorEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[VendorEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<VendorEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<VendorEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<VendorEntity>,
    });
  }

  async create(tenantId: string, data: Partial<VendorEntity>): Promise<VendorEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<VendorEntity>): Promise<VendorEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<VendorEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<VendorEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[VendorEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
