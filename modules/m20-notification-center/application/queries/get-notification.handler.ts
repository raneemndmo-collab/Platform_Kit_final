import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetNotificationQuery } from './get-notification.query';
import { Notification } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetNotificationQuery)
export class GetNotificationHandler implements IQueryHandler<GetNotificationQuery> {
  private readonly logger = new Logger(GetNotificationHandler.name);

  constructor(
    @InjectRepository(Notification, 'm20_connection')
    private readonly repo: Repository<Notification>,
  ) {}

  async execute(query: GetNotificationQuery): Promise<QueryResult<Notification | null>> {
    this.logger.log(`تنفيذ GetNotificationHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetNotificationHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
