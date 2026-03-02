// d12-data-rebinding — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { BindingTemplate } from '../../domain/entities';

@Injectable()
export class BindingTemplateRepository {
  private readonly logger = new Logger(BindingTemplateRepository.name);

  constructor(
    @InjectRepository(BindingTemplate, 'd12_connection')
    private readonly repo: Repository<BindingTemplate>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[BindingTemplate[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<BindingTemplate>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<BindingTemplate | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<BindingTemplate>,
    });
  }

  async create(tenantId: string, data: Partial<BindingTemplate>): Promise<BindingTemplate> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<BindingTemplate>): Promise<BindingTemplate | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<BindingTemplate>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<BindingTemplate>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[BindingTemplate[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
