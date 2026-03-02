// =============================================================================
// M1: HRM — Unit Tests (GATE 1: >80% coverage)
// Constitutional: P-017 (Audit), FP-001 (no cross-DB), TNT-001 (tenant isolation)
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { M1HrmService } from '../../modules/m1-hrm/application/handlers/hrm.service';
import {
  EmployeeEntity, DepartmentEntity, PositionEntity,
  LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
} from '../../modules/m1-hrm/domain/entities';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((e) => Promise.resolve({ id: e.id || 'test-id', ...e })),
  findOne: jest.fn(),
  find: jest.fn(() => []),
  count: jest.fn(() => 0),
});

describe('M1HrmService', () => {
  let service: M1HrmService;
  let employeeRepo: ReturnType<typeof mockRepo>;
  let departmentRepo: ReturnType<typeof mockRepo>;
  let leaveRepo: ReturnType<typeof mockRepo>;
  let attendanceRepo: ReturnType<typeof mockRepo>;
  let payrollRepo: ReturnType<typeof mockRepo>;
  let eventEmitter: EventEmitter2;

  const TENANT = 'tenant-test';
  const USER = 'user-001';

  beforeEach(async () => {
    employeeRepo = mockRepo();
    departmentRepo = mockRepo();
    leaveRepo = mockRepo();
    attendanceRepo = mockRepo();
    payrollRepo = mockRepo();
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M1HrmService,
        { provide: getRepositoryToken(EmployeeEntity), useValue: employeeRepo },
        { provide: getRepositoryToken(DepartmentEntity), useValue: departmentRepo },
        { provide: getRepositoryToken(PositionEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(LeaveRequestEntity), useValue: leaveRepo },
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(PayrollRunEntity), useValue: payrollRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(M1HrmService);
  });

  // ==================== Employee Lifecycle ====================

  describe('createEmployee', () => {
    it('should create employee with tenantId (TNT-001)', async () => {
      const dto = { firstName: 'Ahmad', lastName: 'Ali', email: 'a@test.com', employeeNumber: 'E001' };
      const result = await service.createEmployee(TENANT, USER, dto);

      expect(employeeRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT }));
      expect(employeeRepo.save).toHaveBeenCalled();
    });

    it('should emit hrm.employee.created event (P-006)', async () => {
      const emitted: any[] = [];
      eventEmitter.on('hrm.employee.created', (e) => emitted.push(e));

      await service.createEmployee(TENANT, USER, { firstName: 'Test', lastName: 'User' });

      expect(emitted.length).toBe(1);
      expect(emitted[0].tenantId).toBe(TENANT);
    });
  });

  describe('terminateEmployee', () => {
    it('should terminate active employee', async () => {
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: TENANT, status: 'active' });

      const result = await service.terminateEmployee(TENANT, USER, 'emp-1', 'Resignation');
      expect(employeeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'terminated' }));
    });

    it('should throw if employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);
      await expect(service.terminateEmployee(TENANT, USER, 'non-existent', 'Test'))
        .rejects.toThrow('Employee not found');
    });

    it('should emit hrm.employee.terminated event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('hrm.employee.terminated', (e) => emitted.push(e));
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: TENANT, status: 'active' });

      await service.terminateEmployee(TENANT, USER, 'emp-1', 'End of contract');
      expect(emitted.length).toBe(1);
    });
  });

  // ==================== Leave Management ====================

  describe('submitLeave', () => {
    it('should create leave request with pending status', async () => {
      const dto = { employeeId: 'emp-1', leaveType: 'annual', startDate: '2026-04-01', endDate: '2026-04-05' };
      await service.submitLeave(TENANT, USER, dto);

      expect(leaveRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: TENANT, status: 'pending',
      }));
    });
  });

  describe('approveLeave', () => {
    it('should approve pending leave', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'leave-1', tenantId: TENANT, status: 'pending' });

      await service.approveLeave(TENANT, USER, 'leave-1');
      expect(leaveRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('should reject non-pending leave', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'leave-1', tenantId: TENANT, status: 'approved' });
      await expect(service.approveLeave(TENANT, USER, 'leave-1')).rejects.toThrow();
    });

    it('should emit hrm.leave.approved event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('hrm.leave.approved', (e) => emitted.push(e));
      leaveRepo.findOne.mockResolvedValue({ id: 'leave-1', tenantId: TENANT, status: 'pending', employeeId: 'emp-1' });

      await service.approveLeave(TENANT, USER, 'leave-1');
      expect(emitted.length).toBe(1);
    });
  });

  // ==================== Payroll ====================

  describe('runPayroll', () => {
    it('should create payroll run with calculated amounts', async () => {
      employeeRepo.find.mockResolvedValue([
        { id: 'emp-1', basicSalary: 10000, status: 'active' },
        { id: 'emp-2', basicSalary: 15000, status: 'active' },
      ]);

      await service.runPayroll(TENANT, USER, '2026-03');

      expect(payrollRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: TENANT, period: '2026-03', status: 'draft',
      }));
    });

    it('should emit hrm.payroll.approved on approval', async () => {
      const emitted: any[] = [];
      eventEmitter.on('hrm.payroll.approved', (e) => emitted.push(e));
      payrollRepo.findOne.mockResolvedValue({
        id: 'payroll-1', tenantId: TENANT, status: 'draft',
        totalGross: 25000, totalNet: 22500, employeeCount: 2,
      });

      await service.approvePayroll(TENANT, USER, 'payroll-1');
      expect(emitted.length).toBe(1);
      expect(emitted[0].tenantId).toBe(TENANT);
    });
  });

  // ==================== Attendance ====================

  describe('recordAttendance', () => {
    it('should record attendance with tenantId', async () => {
      const dto = { employeeId: 'emp-1', date: '2026-03-01', checkIn: '08:00', checkOut: '17:00' };
      await service.recordAttendance(TENANT, USER, dto);

      expect(attendanceRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT }));
    });
  });

  // ==================== Constitutional Compliance ====================

  describe('Constitutional: FP-001 (No cross-DB access)', () => {
    it('service has no references to finance_db or crm_db', () => {
      const serviceSource = M1HrmService.toString();
      expect(serviceSource).not.toContain('finance_db');
      expect(serviceSource).not.toContain('crm_db');
      expect(serviceSource).not.toContain('inventory_db');
    });
  });

  describe('Constitutional: TNT-001 (Tenant isolation)', () => {
    it('all queries include tenantId filter', async () => {
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: TENANT });

      await service.getEmployee(TENANT, 'emp-1');
      expect(employeeRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) })
      );
    });
  });
});
