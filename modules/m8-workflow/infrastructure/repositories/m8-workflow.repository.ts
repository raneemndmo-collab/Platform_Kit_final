// m8-workflow — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { WorkflowDefinition } from '../../domain/entities';

@Injectable()
export class WorkflowDefinitionRepository {
  private readonly logger = new Logger(WorkflowDefinitionRepository.name);

  constructor(
    @InjectRepository(WorkflowDefinition, 'm8_connection')
    private readonly repo: Repository<WorkflowDefinition>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[WorkflowDefinition[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<WorkflowDefinition>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<WorkflowDefinition | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<WorkflowDefinition>,
    });
  }

  async create(tenantId: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<WorkflowDefinition>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<WorkflowDefinition>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[WorkflowDefinition[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
