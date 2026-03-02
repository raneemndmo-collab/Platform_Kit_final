// d6-media-engine — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { MediaAsset } from '../../domain/entities';

@Injectable()
export class MediaAssetRepository {
  private readonly logger = new Logger(MediaAssetRepository.name);

  constructor(
    @InjectRepository(MediaAsset, 'd6_connection')
    private readonly repo: Repository<MediaAsset>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[MediaAsset[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<MediaAsset>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<MediaAsset | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<MediaAsset>,
    });
  }

  async create(tenantId: string, data: Partial<MediaAsset>): Promise<MediaAsset> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<MediaAsset>): Promise<MediaAsset | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<MediaAsset>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<MediaAsset>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[MediaAsset[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
