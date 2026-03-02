// m17-vision-ai — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { VisionTask } from '../../domain/entities';

@Injectable()
export class VisionTaskRepository {
  private readonly logger = new Logger(VisionTaskRepository.name);

  constructor(
    @InjectRepository(VisionTask, 'm17_connection')
    private readonly repo: Repository<VisionTask>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[VisionTask[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<VisionTask>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<VisionTask | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<VisionTask>,
    });
  }

  async create(tenantId: string, data: Partial<VisionTask>): Promise<VisionTask> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<VisionTask>): Promise<VisionTask | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<VisionTask>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<VisionTask>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[VisionTask[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
