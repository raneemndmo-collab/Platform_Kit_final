// d7-interaction-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { InteractionLayer } from '../../domain/entities';

@Injectable()
export class InteractionLayerRepository {
  private readonly logger = new Logger(InteractionLayerRepository.name);

  constructor(
    @InjectRepository(InteractionLayer, 'd7_connection')
    private readonly repo: Repository<InteractionLayer>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[InteractionLayer[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<InteractionLayer>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<InteractionLayer | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<InteractionLayer>,
    });
  }

  async create(tenantId: string, data: Partial<InteractionLayer>): Promise<InteractionLayer> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<InteractionLayer>): Promise<InteractionLayer | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<InteractionLayer>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<InteractionLayer>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[InteractionLayer[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
