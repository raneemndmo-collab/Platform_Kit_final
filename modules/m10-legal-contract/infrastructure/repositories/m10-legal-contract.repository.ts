// m10-legal-contract — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Contract } from '../../domain/entities';

@Injectable()
export class ContractRepository {
  private readonly logger = new Logger(ContractRepository.name);

  constructor(
    @InjectRepository(Contract, 'm10_connection')
    private readonly repo: Repository<Contract>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[Contract[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<Contract>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Contract | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<Contract>,
    });
  }

  async create(tenantId: string, data: Partial<Contract>): Promise<Contract> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<Contract>): Promise<Contract | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<Contract>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<Contract>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[Contract[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
