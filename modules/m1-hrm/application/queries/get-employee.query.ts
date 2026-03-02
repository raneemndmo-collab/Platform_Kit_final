// M1-HRM: GetEmployee Query (CQRS)
import { BaseQuery, QueryResult } from '../../../../shared/cqrs';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EmployeeEntity } from '../../../domain/entities';

export class GetEmployeeQuery extends BaseQuery {
  constructor(tenantId: string, public readonly employeeId: string) {
    super(tenantId);
  }
}

@QueryHandler(GetEmployeeQuery)
export class GetEmployeeHandler implements IQueryHandler<GetEmployeeQuery> {
  constructor(
    @InjectRepository(EmployeeEntity) private readonly empRepo: Repository<EmployeeEntity>,
  ) {}

  async execute(query: GetEmployeeQuery): Promise<QueryResult<EmployeeEntity>> {
    const emp = await this.empRepo.findOne({ where: { id: query.employeeId, tenantId: query.tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return { data: emp };
  }
}
