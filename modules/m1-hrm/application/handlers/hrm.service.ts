// =============================================================================
// M1: HRM — Application Service
// Constitutional: Part 4.1 — M1
// Commands: CreateEmployee, UpdateEmployee, SubmitLeave, ApproveLeave, RunPayroll
// Queries: GetEmployee, ListEmployees, GetPayrollSummary, GetAttendanceReport
// =============================================================================

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EmployeeEntity, DepartmentEntity, PositionEntity,
  LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
} from '../../domain/entities';

@Injectable()
export class M1HrmService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M1HrmService.name);

  constructor(
    @InjectRepository(EmployeeEntity, 'm1_connection') private readonly empRepo: Repository<EmployeeEntity>,
    @InjectRepository(DepartmentEntity, 'm1_connection') private readonly deptRepo: Repository<DepartmentEntity>,
    @InjectRepository(PositionEntity, 'm1_connection') private readonly posRepo: Repository<PositionEntity>,
    @InjectRepository(LeaveRequestEntity, 'm1_connection') private readonly leaveRepo: Repository<LeaveRequestEntity>,
    @InjectRepository(AttendanceRecordEntity, 'm1_connection') private readonly attendRepo: Repository<AttendanceRecordEntity>,
    @InjectRepository(PayrollRunEntity, 'm1_connection') private readonly payrollRepo: Repository<PayrollRunEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== Employee Lifecycle ====================

  async createEmployee(tenantId: string, userId: string, dto: Partial<EmployeeEntity>): Promise<EmployeeEntity> {
    const existing = await this.empRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existing) throw new ConflictException('Employee with this email already exists');

    const employee = this.empRepo.create({ ...dto, tenantId, createdBy: userId, status: 'active' });
    const saved = await this.empRepo.save(employee);

    this.safeEmit('hrm.employee.created', {
      tenantId, employeeId: saved.id, employeeNumber: saved.employeeNumber,
      departmentId: saved.departmentId, timestamp: new Date().toISOString(),
    });

    this.logger.log(`Employee created: ref=${saved.id} [tenant=${tenantId}]`);
    return saved;
  }

  async updateEmployee(tenantId: string, userId: string, empId: string, dto: Partial<EmployeeEntity>): Promise<EmployeeEntity> {
    const employee = await this.empRepo.findOne({ where: { id: empId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    Object.assign(employee, dto, { updatedBy: userId });
    const saved = await this.empRepo.save(employee);

    this.safeEmit('hrm.employee.updated', {
      tenantId, employeeId: saved.id, changes: Object.keys(dto), timestamp: new Date(),
    });
    return saved;
  }

  async terminateEmployee(tenantId: string, userId: string, empId: string, reason: string): Promise<EmployeeEntity> {
    const employee = await this.empRepo.findOne({ where: { id: empId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    employee.status = 'terminated';
    employee.terminationDate = new Date();
    employee.updatedBy = userId;
    const saved = await this.empRepo.save(employee);

    this.safeEmit('hrm.employee.terminated', {
      tenantId, employeeId: saved.id, reason, timestamp: new Date(),
    });
    return saved;
  }

  async getEmployee(tenantId: string, empId: string): Promise<EmployeeEntity> {
    const emp = await this.empRepo.findOne({ where: { id: empId, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async listEmployees(tenantId: string, departmentId?: string, status?: string): Promise<EmployeeEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    return this.empRepo.find({ where, order: { lastName: 'ASC' } });
  }

  // ==================== Department & Position ====================

  async createDepartment(tenantId: string, userId: string, dto: Partial<DepartmentEntity>): Promise<DepartmentEntity> {
    const dept = this.deptRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.deptRepo.save(dept);
  }

  async getDepartments(tenantId: string): Promise<DepartmentEntity[]> {
    return this.deptRepo.find({ where: { tenantId, isActive: true } });
  }

  async createPosition(tenantId: string, userId: string, dto: Partial<PositionEntity>): Promise<PositionEntity> {
    const pos = this.posRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.posRepo.save(pos);
  }

  // ==================== Leave Management ====================

  async submitLeave(tenantId: string, userId: string, dto: Partial<LeaveRequestEntity>): Promise<LeaveRequestEntity> {
    const employee = await this.empRepo.findOne({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status !== 'active') throw new BadRequestException('Employee is not active');

    const leave = this.leaveRepo.create({
      ...dto, tenantId, createdBy: userId, status: 'pending',
    });
    return this.leaveRepo.save(leave);
  }

  async approveLeave(tenantId: string, approverId: string, leaveId: string): Promise<LeaveRequestEntity> {
    const leave = await this.leaveRepo.findOne({ where: { id: leaveId, tenantId } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'pending') throw new BadRequestException('Leave is not pending');

    leave.status = 'approved';
    leave.approverId = approverId;
    leave.approvedAt = new Date();
    const saved = await this.leaveRepo.save(leave);

    this.safeEmit('hrm.leave.approved', {
      tenantId, leaveId: saved.id, employeeId: saved.employeeId,
      leaveType: saved.leaveType, days: saved.totalDays, timestamp: new Date(),
    });
    return saved;
  }

  async rejectLeave(tenantId: string, approverId: string, leaveId: string, reason: string): Promise<LeaveRequestEntity> {
    const leave = await this.leaveRepo.findOne({ where: { id: leaveId, tenantId } });
    if (!leave) throw new NotFoundException('Leave request not found');

    leave.status = 'rejected';
    leave.approverId = approverId;
    leave.rejectionReason = reason;
    return this.leaveRepo.save(leave);
  }

  // ==================== Attendance ====================

  async recordAttendance(tenantId: string, userId: string, dto: Partial<AttendanceRecordEntity>): Promise<AttendanceRecordEntity> {
    const record = this.attendRepo.create({ ...dto, tenantId, createdBy: userId });
    const saved = await this.attendRepo.save(record);

    this.safeEmit('hrm.attendance.recorded', {
      tenantId, employeeId: dto.employeeId, date: dto.date, status: dto.status,
    });
    return saved;
  }

  async getAttendanceReport(tenantId: string, employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecordEntity[]> {
    return this.attendRepo
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.employeeId = :employeeId', { employeeId })
      .andWhere('a.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('a.date', 'ASC')
      .getMany();
  }

  // ==================== Payroll ====================

  async runPayroll(tenantId: string, userId: string, period: string): Promise<PayrollRunEntity> {
    const existing = await this.payrollRepo.findOne({ where: { tenantId, period } });
    if (existing && existing.status !== 'draft') {
      throw new ConflictException(`Payroll for ${period} is already ${existing.status}`);
    }

    const employees = await this.empRepo.find({ where: { tenantId, status: 'active' } });

    let totalGross = 0;
    const breakdown: Record<string, unknown> = {};

    for (const emp of employees) {
      const gross = Number(emp.baseSalary);
      const deductions = gross * 0.1; // Simplified: 10% deductions
      const net = gross - deductions;

      breakdown[emp.id] = {
        employeeId: emp.id, name: `${emp.firstName} ${emp.lastName}`,
        gross, deductions, net,
      };
      totalGross += gross;
    }

    const totalDeductions = totalGross * 0.1;
    const totalNet = totalGross - totalDeductions;

    const payroll = this.payrollRepo.create({
      tenantId, period, createdBy: userId,
      periodStart: new Date(`${period}-01`),
      periodEnd: new Date(`${period}-28`),
      status: 'review',
      employeeCount: employees.length,
      totalGross, totalDeductions, totalNet,
      breakdown,
    });
    return this.payrollRepo.save(payroll);
  }

  async approvePayroll(tenantId: string, approverId: string, payrollId: string): Promise<PayrollRunEntity> {
    const payroll = await this.payrollRepo.findOne({ where: { id: payrollId, tenantId } });
    if (!payroll) throw new NotFoundException('Payroll run not found');
    if (payroll.status !== 'review') throw new BadRequestException('Payroll is not in review status');

    payroll.status = 'approved';
    payroll.approvedBy = approverId;
    payroll.approvedAt = new Date();
    const saved = await this.payrollRepo.save(payroll);

    this.safeEmit('hrm.payroll.approved', {
      tenantId, payrollId: saved.id, period: saved.period,
      totalNet: saved.totalNet, employeeCount: saved.employeeCount, timestamp: new Date(),
    });
    return saved;
  }

  async getPayrollSummary(tenantId: string, period?: string): Promise<PayrollRunEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (period) where.period = period;
    return this.payrollRepo.find({ where, order: { period: 'DESC' } });
  }

  // A3 FIX: Bulk employee import — single DB write
  async bulkImportEmployees(tenantId: string, employees: Array<{ firstName: string; lastName: string; email: string; department?: string }>): Promise<{ imported: number }> {
    const entities = employees.map(e => this.employeeRepo.create({ tenantId, ...e, status: 'active', hireDate: new Date() }));
    await this.employeeRepo.save(entities);
    return { imported: entities.length };
  }
}
