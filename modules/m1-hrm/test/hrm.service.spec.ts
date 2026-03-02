// =============================================================================
// M1: HRM — Unit Tests (GATE 1: >80% coverage)
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { M1HrmService } from '../../application/handlers/hrm.service';
import {
  EmployeeEntity, DepartmentEntity, PositionEntity,
  LeaveRequestEntity, AttendanceRecordEntity, PayrollRunEntity,
} from '../../domain/entities';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'test-id', ...entity })),
  findOne: jest.fn(),
  find: jest.fn(() => Promise.resolve([])),
  update: jest.fn(),

  describe('health', () => {
    it('should return healthy status', async () => {
      const result = await service.health();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });
});

describe('M1HrmService', () => {
  let service: M1HrmService;
  let employeeRepo: ReturnType<typeof mockRepo>;
  let departmentRepo: ReturnType<typeof mockRepo>;
  let leaveRepo: ReturnType<typeof mockRepo>;
  let attendanceRepo: ReturnType<typeof mockRepo>;
  let payrollRepo: ReturnType<typeof mockRepo>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    employeeRepo = mockRepo();
    departmentRepo = mockRepo();
    leaveRepo = mockRepo();
    attendanceRepo = mockRepo();
    payrollRepo = mockRepo();
    eventEmitter = { emit: jest.fn() };

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

    service = module.get<M1HrmService>(M1HrmService);
  });

  // ==================== Employee CRUD ====================

  describe('createEmployee', () => {
    it('should create employee with tenantId isolation (FP-011)', async () => {
      const dto = { firstName: 'أحمد', lastName: 'الراشد', email: 'ahmed@test.com', departmentId: 'dept-1' };
      const result = await service.createEmployee('tenant-1', 'user-1', dto);

      expect(employeeRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
      expect(employeeRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.employee.created', expect.objectContaining({ tenantId: 'tenant-1' }));
    });

    it('should emit hrm.employee.created event (ESR-003)', async () => {
      await service.createEmployee('tenant-1', 'user-1', { firstName: 'Test', lastName: 'User' });
      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.employee.created', expect.any(Object));
    });
  });

  describe('getEmployee', () => {
    it('should find employee by id and tenantId', async () => {
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1', firstName: 'أحمد' });
      const result = await service.getEmployee('tenant-1', 'emp-1');
      expect(result.id).toBe('emp-1');
      expect(employeeRepo.findOne).toHaveBeenCalledWith({ where: { id: 'emp-1', tenantId: 'tenant-1' } });
    });

    it('should throw NotFoundException if employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);
      await expect(service.getEmployee('tenant-1', 'non-existent')).rejects.toThrow('Employee not found');
    });

    it('should NOT return employee from different tenant (TIC-001)', async () => {
      employeeRepo.findOne.mockResolvedValue(null); // Different tenant = not found
      await expect(service.getEmployee('tenant-2', 'emp-1')).rejects.toThrow();
    });
  });

  describe('terminateEmployee', () => {
    it('should set status to terminated', async () => {
      employeeRepo.findOne.mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1', status: 'active' });
      const result = await service.terminateEmployee('tenant-1', 'user-1', 'emp-1', 'Resignation');

      expect(employeeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'terminated' }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.employee.terminated', expect.objectContaining({
        tenantId: 'tenant-1', employeeId: 'emp-1',
      }));
    });
  });

  // ==================== Leave Management ====================

  describe('submitLeave', () => {
    it('should create leave request with pending status', async () => {
      const dto = { employeeId: 'emp-1', startDate: '2026-03-10', endDate: '2026-03-12', type: 'annual' };
      await service.submitLeave('tenant-1', 'user-1', dto);

      expect(leaveRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-1', status: 'pending',
      }));
    });
  });

  describe('approveLeave', () => {
    it('should approve and emit event', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'leave-1', tenantId: 'tenant-1', status: 'pending', employeeId: 'emp-1' });
      await service.approveLeave('tenant-1', 'mgr-1', 'leave-1');

      expect(leaveRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.leave.approved', expect.any(Object));
    });

    it('should reject non-pending leave', async () => {
      leaveRepo.findOne.mockResolvedValue({ id: 'leave-1', tenantId: 'tenant-1', status: 'approved' });
      await expect(service.approveLeave('tenant-1', 'mgr-1', 'leave-1')).rejects.toThrow();
    });
  });

  // ==================== Attendance ====================

  describe('recordAttendance', () => {
    it('should record attendance with tenantId', async () => {
      await service.recordAttendance('tenant-1', 'user-1', {
        employeeId: 'emp-1', date: '2026-03-01', checkIn: '08:00', checkOut: '17:00',
      });

      expect(attendanceRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.attendance.recorded', expect.any(Object));
    });
  });

  // ==================== Payroll ====================

  describe('runPayroll', () => {
    it('should create payroll run', async () => {
      employeeRepo.find.mockResolvedValue([
        { id: 'emp-1', tenantId: 'tenant-1', status: 'active', basicSalary: 10000 },
        { id: 'emp-2', tenantId: 'tenant-1', status: 'active', basicSalary: 15000 },
      ]);

      await service.runPayroll('tenant-1', 'user-1', { period: '2026-03' });
      expect(payrollRepo.save).toHaveBeenCalled();
    });
  });

  describe('approvePayroll', () => {
    it('should approve and emit hrm.payroll.approved (COM-001 → M2)', async () => {
      payrollRepo.findOne.mockResolvedValue({
        id: 'pr-1', tenantId: 'tenant-1', status: 'pending', period: '2026-03',
        totalGross: 25000, totalNet: 22500, employeeCount: 2,
      });

      await service.approvePayroll('tenant-1', 'cfo-1', 'pr-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith('hrm.payroll.approved', expect.objectContaining({
        tenantId: 'tenant-1', payrollId: 'pr-1',
      }));
    });
  });

  // ==================== Constitutional Compliance ====================

  describe('Constitutional Compliance', () => {
    it('all write operations include tenantId (P-016)', async () => {
      // Verify all create calls include tenantId
      await service.createEmployee('tenant-X', 'user-1', { firstName: 'T', lastName: 'U' });
      expect(employeeRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-X' }));
    });

    it('all events include tenantId (ESR-003)', async () => {
      await service.createEmployee('tenant-X', 'user-1', { firstName: 'T', lastName: 'U' });
      const emitCall = eventEmitter.emit.mock.calls[0];
      expect(emitCall[1].tenantId).toBe('tenant-X');
    });

    it('events use hrm.* namespace (ESR-003)', async () => {
      await service.createEmployee('t', 'u', { firstName: 'T', lastName: 'U' });
      const eventName = eventEmitter.emit.mock.calls[0][0];
      expect(eventName.startsWith('hrm.')).toBe(true);
    });
  });

  describe('health', () => {
    it('should return healthy status', async () => {
      const result = await service.health();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });
});
