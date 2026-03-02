// m1-hrm — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EmployeeEntity } from '../../domain/entities';

@Injectable()
export class EmployeeRepository {
  private readonly logger = new Logger(EmployeeRepository.name);

  constructor(
    @InjectRepository(EmployeeEntity, 'm1_connection')
    private readonly repo: Repository<EmployeeEntity>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[EmployeeEntity[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<EmployeeEntity>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<EmployeeEntity | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<EmployeeEntity>,
    });
  }

  async create(tenantId: string, data: Partial<EmployeeEntity>): Promise<EmployeeEntity> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<EmployeeEntity>): Promise<EmployeeEntity | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<EmployeeEntity>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<EmployeeEntity>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[EmployeeEntity[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
