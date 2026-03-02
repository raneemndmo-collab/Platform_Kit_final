// m22-personalization — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { UserProfile } from '../../domain/entities';

@Injectable()
export class UserProfileRepository {
  private readonly logger = new Logger(UserProfileRepository.name);

  constructor(
    @InjectRepository(UserProfile, 'm22_connection')
    private readonly repo: Repository<UserProfile>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[UserProfile[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<UserProfile>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<UserProfile | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<UserProfile>,
    });
  }

  async create(tenantId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<UserProfile>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<UserProfile>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[UserProfile[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
