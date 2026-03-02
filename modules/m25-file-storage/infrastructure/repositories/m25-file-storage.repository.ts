// m25-file-storage — Repository
// عزل المستأجر إلزامي في جميع الاستعلامات
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { FileMetadata } from '../../domain/entities';

@Injectable()
export class FileMetadataRepository {
  private readonly logger = new Logger(FileMetadataRepository.name);

  constructor(
    @InjectRepository(FileMetadata, 'm25_connection')
    private readonly repo: Repository<FileMetadata>,
  ) {}

  async findByTenant(tenantId: string, skip = 0, take = 20): Promise<[FileMetadata[], number]> {
    this.logger.debug(`findByTenant: tenant=${tenantId} skip=${skip} take=${take}`);
    return this.repo.findAndCount({
      where: { tenantId } as FindOptionsWhere<FileMetadata>,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<FileMetadata | null> {
    return this.repo.findOne({
      where: { id, tenantId } as FindOptionsWhere<FileMetadata>,
    });
  }

  async create(tenantId: string, data: Partial<FileMetadata>): Promise<FileMetadata> {
    const entity = this.repo.create({ ...data, tenantId });
    return this.repo.save(entity);
  }

  async update(tenantId: string, id: string, data: Partial<FileMetadata>): Promise<FileMetadata | null> {
    await this.repo.update(
      { id, tenantId } as FindOptionsWhere<FileMetadata>,
      data,
    );
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete(
      { id, tenantId } as FindOptionsWhere<FileMetadata>,
    );
    return (result.affected ?? 0) > 0;
  }

  async search(tenantId: string, query: string, skip = 0, take = 20): Promise<[FileMetadata[], number]> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .skip(skip)
      .take(take)
      .orderBy('e.createdAt', 'DESC');
    return qb.getManyAndCount();
  }
}
