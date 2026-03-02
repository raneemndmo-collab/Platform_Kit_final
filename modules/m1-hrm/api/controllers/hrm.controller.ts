// =============================================================================
// M1: HRM — API Controller
// API Surface: /api/v1/hrm/*
// =============================================================================

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth , ApiResponse} from '@nestjs/swagger';
import { M1HrmService } from '../../application/handlers/hrm.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M1: HRM')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/hrm')
export class M1HrmController {
  constructor(private readonly service: M1HrmService) {}

  @Get('health')
  health() { return { status: 'healthy', module: 'M1', service: 'HRM', timestamp: new Date() }; }

  // --- Employees ---
  @Post('employees')
  @Audit('confidential')
  @ApiOperation({ summary: 'Create employee' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  createEmployee(@Body() dto: Record<string, unknown>) { return this.service.createEmployee(dto.tenantId, dto.userId, dto); }

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  listEmployees(@Query('tenantId') tenantId: string, @Query('departmentId') deptId?: string, @Query('status') status?: string) {
    return this.service.listEmployees(tenantId, deptId, status);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  getEmployee(@Query('tenantId') tenantId: string, @Param('id') id: string) { return this.service.getEmployee(tenantId, id); }

  @Put('employees/:id')
  @Audit('confidential')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  updateEmployee(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateEmployee(tenantId, dto.userId, id, dto);
  }

  @Post('employees/:id/terminate')
  @Audit('restricted')
  @ApiOperation({ summary: 'Terminate employee' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  terminateEmployee(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.terminateEmployee(tenantId, dto.userId, id, dto.reason);
  }

  // --- Departments ---
  @Post('departments')
  @Audit('internal')
  createDepartment(@Body() dto: Record<string, unknown>) { return this.service.createDepartment(dto.tenantId, dto.userId, dto); }

  @Get('departments')
  getDepartments(@Query('tenantId') tenantId: string) { return this.service.getDepartments(tenantId); }

  // --- Leave ---
  @Post('leave')
  @Audit('internal')
  submitLeave(@Body() dto: Record<string, unknown>) { return this.service.submitLeave(dto.tenantId, dto.userId, dto); }

  @Post('leave/:id/approve')
  @Audit('internal')
  approveLeave(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.approveLeave(tenantId, dto.approverId, id);
  }

  @Post('leave/:id/reject')
  @Audit('internal')
  rejectLeave(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.rejectLeave(tenantId, dto.approverId, id, dto.reason);
  }

  // --- Attendance ---
  @Post('attendance')
  @Audit('internal')
  recordAttendance(@Body() dto: Record<string, unknown>) { return this.service.recordAttendance(dto.tenantId, dto.userId, dto); }

  @Get('attendance/report')
  getAttendanceReport(@Query('tenantId') t: string, @Query('employeeId') e: string, @Query('start') s: string, @Query('end') end: string) {
    return this.service.getAttendanceReport(t, e, s, end);
  }

  // --- Payroll ---
  @Post('payroll/run')
  @Audit('restricted')
  runPayroll(@Body() dto: Record<string, unknown>) { return this.service.runPayroll(dto.tenantId, dto.userId, dto.period); }

  @Post('payroll/:id/approve')
  @Audit('restricted')
  approvePayroll(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.approvePayroll(tenantId, dto.approverId, id);
  }

  @Get('payroll')
  getPayrollSummary(@Query('tenantId') tenantId: string, @Query('period') period?: string) {
    return this.service.getPayrollSummary(tenantId, period);
  }
}
