// m2-finance — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AccountEntity } from '../../domain/entities';

@Injectable()
export class AccountRepository {
  private readonly logger = new Logger(AccountRepository.name);

  constructor(
    @InjectRepository(AccountEntity, 'm2_connection')
    private readonly repo: Repository<AccountEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[AccountEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<AccountEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AccountEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<AccountEntity>,
    });
  }

  async create(tenantId: string, data: Partial<AccountEntity>): Promise<AccountEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<AccountEntity>): Promise<AccountEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<AccountEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<AccountEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[AccountEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
