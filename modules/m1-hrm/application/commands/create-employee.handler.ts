// M1-HRM: CreateEmployee Command Handler (CQRS)
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeCommand } from './create-employee.command';
import { EmployeeEntity } from '../../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateEmployeeCommand)
export class CreateEmployeeHandler implements ICommandHandler<CreateEmployeeCommand> {
  private readonly logger = new Logger(CreateEmployeeHandler.name);

  constructor(
    @InjectRepository(EmployeeEntity, 'm1_connection') private readonly empRepo: Repository<EmployeeEntity>,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<CommandResult<EmployeeEntity>> {
    const existing = await this.empRepo.findOne({
      where: { tenantId: command.tenantId, email: command.email },
    });
    if (existing) throw new ConflictException('Employee with this email already exists');

    const employee = this.empRepo.create({
      tenantId: command.tenantId,
      employeeNumber: command.employeeNumber,
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      departmentId: command.departmentId,
      positionId: command.positionId,
      status: 'active',
      createdBy: command.userId,
      updatedBy: command.userId,
    });

    const saved = await this.empRepo.save(employee);

    this.logger.log(`Employee created: ref=${saved.id} [tenant=${command.tenantId}]`);

    return { success: true, data: saved, correlationId: command.correlationId };
  }
}
