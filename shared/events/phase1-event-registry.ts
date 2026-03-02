// =============================================================================
// Phase 1: Event Schema Registry (GATE 6)
// Constitutional: ESR-001 (all events registered), ESR-003 (namespace convention)
// All Phase 1 event types with payload schemas
// =============================================================================

export interface EventSchema {
  name: string;
  namespace: string;
  module: string;
  version: string;
  payload: Record<string, string>;
  description: string;
}

export const PHASE1_EVENT_REGISTRY: EventSchema[] = [
  // ======================== M30: Gateway ========================
  {
    name: 'gateway.rate.exceeded', namespace: 'gateway', module: 'M30', version: '1.0.0',
    description: 'Rate limit exceeded for API key or client',
    payload: { tenantId: 'string', apiKey: 'string', endpoint: 'string', limit: 'number', timestamp: 'Date' },
  },
  {
    name: 'gateway.error.upstream', namespace: 'gateway', module: 'M30', version: '1.0.0',
    description: 'Upstream module returned an error',
    payload: { tenantId: 'string', route: 'string', statusCode: 'number', error: 'string', timestamp: 'Date' },
  },

  // ======================== M1: HRM ========================
  {
    name: 'hrm.employee.created', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'New employee onboarded',
    payload: { tenantId: 'string', employeeId: 'string', employeeNumber: 'string', departmentId: 'string', timestamp: 'Date' },
  },
  {
    name: 'hrm.employee.updated', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'Employee record updated',
    payload: { tenantId: 'string', employeeId: 'string', changes: 'string[]', timestamp: 'Date' },
  },
  {
    name: 'hrm.employee.terminated', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'Employee terminated',
    payload: { tenantId: 'string', employeeId: 'string', reason: 'string', effectiveDate: 'Date', timestamp: 'Date' },
  },
  {
    name: 'hrm.leave.approved', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'Leave request approved',
    payload: { tenantId: 'string', leaveId: 'string', employeeId: 'string', leaveType: 'string', startDate: 'string', endDate: 'string', timestamp: 'Date' },
  },
  {
    name: 'hrm.payroll.approved', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'Payroll run approved — triggers Finance AP entry (COM-001)',
    payload: { tenantId: 'string', payrollId: 'string', period: 'string', totalGross: 'number', totalNet: 'number', employeeCount: 'number', timestamp: 'Date' },
  },
  {
    name: 'hrm.attendance.recorded', namespace: 'hrm', module: 'M1', version: '1.0.0',
    description: 'Attendance record logged',
    payload: { tenantId: 'string', employeeId: 'string', date: 'string', hoursWorked: 'number', timestamp: 'Date' },
  },

  // ======================== M2: Finance ========================
  {
    name: 'finance.invoice.created', namespace: 'finance', module: 'M2', version: '1.0.0',
    description: 'New invoice created',
    payload: { tenantId: 'string', invoiceId: 'string', invoiceNumber: 'string', totalAmount: 'number', customerId: 'string', timestamp: 'Date' },
  },
  {
    name: 'finance.invoice.approved', namespace: 'finance', module: 'M2', version: '1.0.0',
    description: 'Invoice approved with ledger entries',
    payload: { tenantId: 'string', invoiceId: 'string', totalAmount: 'number', timestamp: 'Date' },
  },
  {
    name: 'finance.payment.received', namespace: 'finance', module: 'M2', version: '1.0.0',
    description: 'Payment recorded against invoice',
    payload: { tenantId: 'string', paymentId: 'string', invoiceId: 'string', amount: 'number', method: 'string', timestamp: 'Date' },
  },
  {
    name: 'finance.budget.exceeded', namespace: 'finance', module: 'M2', version: '1.0.0',
    description: 'Budget allocation exceeded threshold',
    payload: { tenantId: 'string', budgetId: 'string', totalAmount: 'number', spentAmount: 'number', timestamp: 'Date' },
  },
  {
    name: 'finance.period.closed', namespace: 'finance', module: 'M2', version: '1.0.0',
    description: 'Financial period closed',
    payload: { tenantId: 'string', period: 'string', closedBy: 'string', timestamp: 'Date' },
  },

  // ======================== M3: CRM ========================
  {
    name: 'crm.lead.created', namespace: 'crm', module: 'M3', version: '1.0.0',
    description: 'New lead captured',
    payload: { tenantId: 'string', leadId: 'string', source: 'string', timestamp: 'Date' },
  },
  {
    name: 'crm.lead.converted', namespace: 'crm', module: 'M3', version: '1.0.0',
    description: 'Lead converted to opportunity',
    payload: { tenantId: 'string', leadId: 'string', opportunityId: 'string', timestamp: 'Date' },
  },
  {
    name: 'crm.opportunity.won', namespace: 'crm', module: 'M3', version: '1.0.0',
    description: 'Opportunity closed/won',
    payload: { tenantId: 'string', opportunityId: 'string', value: 'number', contactId: 'string', timestamp: 'Date' },
  },
  {
    name: 'crm.opportunity.lost', namespace: 'crm', module: 'M3', version: '1.0.0',
    description: 'Opportunity closed/lost',
    payload: { tenantId: 'string', opportunityId: 'string', value: 'number', reason: 'string', timestamp: 'Date' },
  },
  {
    name: 'crm.activity.logged', namespace: 'crm', module: 'M3', version: '1.0.0',
    description: 'Activity logged against contact',
    payload: { tenantId: 'string', activityId: 'string', contactId: 'string', type: 'string', timestamp: 'Date' },
  },

  // ======================== M4: Inventory ========================
  {
    name: 'inventory.stock.received', namespace: 'inventory', module: 'M4', version: '1.0.0',
    description: 'Stock received into warehouse',
    payload: { tenantId: 'string', itemId: 'string', warehouseId: 'string', quantity: 'number', timestamp: 'Date' },
  },
  {
    name: 'inventory.stock.issued', namespace: 'inventory', module: 'M4', version: '1.0.0',
    description: 'Stock issued from warehouse',
    payload: { tenantId: 'string', itemId: 'string', warehouseId: 'string', quantity: 'number', timestamp: 'Date' },
  },
  {
    name: 'inventory.stock.low', namespace: 'inventory', module: 'M4', version: '1.0.0',
    description: 'Stock below reorder level — triggers Procurement alert (COM-001)',
    payload: { tenantId: 'string', itemId: 'string', warehouseId: 'string', currentQuantity: 'number', reorderLevel: 'number', reorderQuantity: 'number', timestamp: 'Date' },
  },
  {
    name: 'inventory.stock.adjusted', namespace: 'inventory', module: 'M4', version: '1.0.0',
    description: 'Stock adjustment (count, shrinkage, etc.)',
    payload: { tenantId: 'string', itemId: 'string', warehouseId: 'string', oldQuantity: 'number', newQuantity: 'number', reason: 'string', timestamp: 'Date' },
  },

  // ======================== M5: Procurement ========================
  {
    name: 'procurement.order.created', namespace: 'procurement', module: 'M5', version: '1.0.0',
    description: 'Purchase order created',
    payload: { tenantId: 'string', orderId: 'string', poNumber: 'string', vendorId: 'string', totalAmount: 'number', timestamp: 'Date' },
  },
  {
    name: 'procurement.order.approved', namespace: 'procurement', module: 'M5', version: '1.0.0',
    description: 'Purchase order approved — triggers Finance AP (COM-001)',
    payload: { tenantId: 'string', orderId: 'string', poNumber: 'string', totalAmount: 'number', vendorId: 'string', timestamp: 'Date' },
  },
  {
    name: 'procurement.order.received', namespace: 'procurement', module: 'M5', version: '1.0.0',
    description: 'Goods received against PO — triggers Inventory stock update (COM-001)',
    payload: { tenantId: 'string', orderId: 'string', receiptId: 'string', warehouseId: 'string', items: 'object[]', fullyReceived: 'boolean', timestamp: 'Date' },
  },
  {
    name: 'procurement.vendor.onboarded', namespace: 'procurement', module: 'M5', version: '1.0.0',
    description: 'New vendor onboarded',
    payload: { tenantId: 'string', vendorId: 'string', name: 'string', timestamp: 'Date' },
  },
];

// ==================== Cross-Module Event Flow Map ====================
export const CROSS_MODULE_FLOWS = [
  { source: 'M1', event: 'hrm.payroll.approved', target: 'M2', action: 'Create salary expense entries' },
  { source: 'M5', event: 'procurement.order.approved', target: 'M2', action: 'Create accounts payable entry' },
  { source: 'M4', event: 'inventory.stock.low', target: 'M5', action: 'Auto-generate PO suggestion' },
  { source: 'M5', event: 'procurement.order.received', target: 'M4', action: 'Auto-receive stock into warehouse' },
  { source: 'M2', event: 'finance.payment.received', target: 'M3', action: 'Update customer payment status' },
];

// ==================== Validation ====================
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const schema of PHASE1_EVENT_REGISTRY) {
    // ESR-003: namespace convention
    if (!schema.name.startsWith(`${schema.namespace}.`)) {
      errors.push(`${schema.name} does not match namespace ${schema.namespace}`);
    }
    // Unique names
    if (names.has(schema.name)) {
      errors.push(`Duplicate event name: ${schema.name}`);
    }
    names.add(schema.name);
    // Payload must have tenantId (TNT-001)
    if (!schema.payload.tenantId) {
      errors.push(`${schema.name} missing tenantId in payload (TNT-001 violation)`);
    }
    // Payload must have timestamp
    if (!schema.payload.timestamp) {
      errors.push(`${schema.name} missing timestamp in payload`);
    }
  }

  return { valid: errors.length === 0, errors };
}
