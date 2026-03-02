import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M1HrmController } from './api/controllers/hrm.controller';
import { M1HrmService } from './application/handlers/hrm.service';
import {
import { CreateEmployeeHandler } from './application/commands/create-employee.handler';
  EmployeeEntity, DepartmentEntity, PositionEntity,
  LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
} from './domain/entities';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([
    EmployeeEntity, DepartmentEntity, PositionEntity,
    LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
  ], 'm1_connection')],
  controllers: [M1HrmController],
  providers: [M1HrmService, CreateEmployeeHandler],
  exports: [M1HrmService],
})
export class M1HrmModule {}
