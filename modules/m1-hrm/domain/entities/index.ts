// =============================================================================
// M1: HRM — Domain Entities
// Constitutional: Part 4.1 — M1
// Entities: Employee, Department, Position, LeaveRequest, AttendanceRecord, PayrollRun
// Database: hrm_db (exclusive). RLS on tenantId. FORBIDDEN: access to finance_db, crm_db.
// =============================================================================

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('employees')
export class EmployeeEntity extends RasidBaseEntity {
  @Column()
  @Index()
  employeeNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  @Index()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  nationalId: string;

  @Column()
  departmentId: string;

  @Column()
  positionId: string;

  @Column({ nullable: true })
  managerId: string;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ default: 'active' })
  @Index()
  status: string; // active, on_leave, suspended, terminated

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  baseSalary: number;

  @Column({ default: 'SAR' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact: Record<string, unknown>;

  @Column({ nullable: true })
  userId: string; // Link to K1 Auth
}

@Entity('departments')
export class DepartmentEntity extends RasidBaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  parentDepartmentId: string;

  @Column({ nullable: true })
  managerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  headcount: number;
}

@Entity('positions')
export class PositionEntity extends RasidBaseEntity {
  @Column()
  title: string;

  @Column({ unique: true })
  code: string;

  @Column()
  departmentId: string;

  @Column({ nullable: true })
  gradeLevel: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minSalary: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxSalary: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description: string;
}

@Entity('leave_requests')
export class LeaveRequestEntity extends RasidBaseEntity {
  @Column()
  @Index()
  employeeId: string;

  @Column()
  leaveType: string; // annual, sick, maternity, paternity, unpaid, emergency

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 4, scale: 1 })
  totalDays: number;

  @Column({ default: 'pending' })
  @Index()
  status: string; // pending, approved, rejected, cancelled

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  approverId: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;
}

@Entity('attendance_records')
export class AttendanceRecordEntity extends RasidBaseEntity {
  @Column()
  @Index()
  employeeId: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOut: Date;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  hoursWorked: number;

  @Column({ default: 'present' })
  status: string; // present, absent, late, half_day, holiday, weekend

  @Column({ nullable: true })
  overtimeHours: number;

  @Column({ nullable: true })
  notes: string;
}

@Entity('payroll_runs')
export class PayrollRunEntity extends RasidBaseEntity {
  @Column()
  @Index()
  period: string; // 2026-01, 2026-02, etc.

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ default: 'draft' })
  @Index()
  status: string; // draft, calculating, review, approved, paid, cancelled

  @Column({ type: 'int', default: 0 })
  employeeCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalGross: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalNet: number;

  @Column({ default: 'SAR' })
  currency: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  breakdown: Record<string, unknown>; // Per-employee payroll details

export {
  EmployeeEntity, DepartmentEntity, PositionEntity,
  LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
};
}
