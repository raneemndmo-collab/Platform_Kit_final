// m3-crm — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ContactEntity } from '../../domain/entities';

@Injectable()
export class ContactRepository {
  private readonly logger = new Logger(ContactRepository.name);

  constructor(
    @InjectRepository(ContactEntity, 'm3_connection')
    private readonly repo: Repository<ContactEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[ContactEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<ContactEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ContactEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<ContactEntity>,
    });
  }

  async create(tenantId: string, data: Partial<ContactEntity>): Promise<ContactEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<ContactEntity>): Promise<ContactEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<ContactEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<ContactEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[ContactEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
