// M1-HRM: CreateEmployee Command (CQRS)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateEmployeeCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly employeeNumber: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly departmentId?: string,
    public readonly positionId?: string,
  ) {
    super(tenantId, userId);
  }
}
