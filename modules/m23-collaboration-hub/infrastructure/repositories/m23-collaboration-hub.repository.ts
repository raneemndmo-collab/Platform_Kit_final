// m23-collaboration-hub — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CollaborationChannel } from '../../domain/entities';

@Injectable()
export class CollaborationChannelRepository {
  private readonly logger = new Logger(CollaborationChannelRepository.name);

  constructor(
    @InjectRepository(CollaborationChannel, 'm23_connection')
    private readonly repo: Repository<CollaborationChannel>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[CollaborationChannel[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<CollaborationChannel>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<CollaborationChannel | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<CollaborationChannel>,
    });
  }

  async create(tenantId: string, data: Partial<CollaborationChannel>): Promise<CollaborationChannel> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<CollaborationChannel>): Promise<CollaborationChannel | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<CollaborationChannel>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<CollaborationChannel>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[CollaborationChannel[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
