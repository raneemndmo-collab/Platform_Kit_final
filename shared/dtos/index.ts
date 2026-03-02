/**
 * B2: Complete DTOs + ValidationPipe
 * ────────────────────────────────────────────────────────
 * Data Transfer Objects with class-validator decorators
 * for all controllers. Global ValidationPipe setup.
 * Constitutional: P-009 (Input Validation), SEC-005
 */
import {
  IsString, IsUUID, IsOptional, IsInt, Min, Max, IsEnum,
  IsBoolean, IsNumber, IsArray, MinLength, MaxLength,
  IsISO8601, IsObject, ValidateNested, IsNotEmpty, IsEmail,
  ArrayMinSize, ArrayMaxSize, Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════
// Base DTOs — Reusable across all controllers
// ═══════════════════════════════════════════════════════

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 200 })
  @IsOptional() @IsInt() @Min(1) @Max(200) @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional() @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class TenantAwareDto {
  // Injected by TenantGuard — never from user input
  tenantId?: string;
}

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'ISO 8601 start date' })
  @IsOptional() @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end date' })
  @IsOptional() @IsISO8601()
  endDate?: string;
}

export class IdParamDto {
  @ApiProperty() @IsUUID()
  id!: string;
}

// ═══════════════════════════════════════════════════════
// APIL Orchestrator DTOs
// ═══════════════════════════════════════════════════════

export class CreateExecutionPlanDto extends TenantAwareDto {
  @ApiProperty({ description: 'Input text/data for processing' })
  @IsString() @MinLength(1) @MaxLength(10000)
  input!: string;

  @ApiProperty({ enum: ['STRICT', 'PROFESSIONAL', 'HYBRID'] })
  @IsEnum(['STRICT', 'PROFESSIONAL', 'HYBRID'])
  mode!: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20)
  agents?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional() @IsInt() @Min(1) @Max(10) @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  enableGpu?: boolean;

  @ApiPropertyOptional({ description: 'Max duration in ms', minimum: 1000 })
  @IsOptional() @IsInt() @Min(1000) @Max(3600000) @Type(() => Number)
  maxDuration?: number;
}

export class ExecutePlanDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  planId!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject()
  overrides?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Data Intelligence DTOs
// ═══════════════════════════════════════════════════════

export class InferDataModelDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  datasetId!: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 100000 })
  @IsOptional() @IsInt() @Min(100) @Max(100000) @Type(() => Number)
  sampleSize?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  inferRelationships?: boolean;
}

export class WhatIfScenarioDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  baseDataId!: string;

  @ApiProperty() @IsString() @MinLength(1)
  variable!: string;

  @ApiProperty({ minimum: -100, maximum: 1000 })
  @IsNumber() @Min(-100) @Max(1000)
  changePercent!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(100) @Max(100000) @Type(() => Number)
  iterations?: number;
}

export class MonteCarloSimulationDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  datasetId!: string;

  @ApiProperty() @IsString() @MinLength(1)
  targetField!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(100) @Max(1000000) @Type(() => Number)
  iterations?: number;

  @ApiPropertyOptional({ minimum: 0.8, maximum: 0.99 })
  @IsOptional() @IsNumber() @Min(0.8) @Max(0.99)
  confidenceLevel?: number;
}

export class CohortAnalysisDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  datasetId!: string;

  @ApiProperty() @IsString()
  cohortField!: string;

  @ApiProperty() @IsString()
  metricField!: string;

  @ApiProperty() @IsString()
  timeField!: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @IsOptional() @IsEnum(['day', 'week', 'month', 'quarter', 'year'])
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

// ═══════════════════════════════════════════════════════
// BI Cognitive DTOs
// ═══════════════════════════════════════════════════════

export class CreateDashboardDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [String] }) @IsArray() @IsUUID(undefined, { each: true })
  dataSourceIds!: string[];

  @ApiPropertyOptional({ enum: ['auto', 'grid', 'freeform'] })
  @IsOptional() @IsEnum(['auto', 'grid', 'freeform'])
  layout?: 'auto' | 'grid' | 'freeform';
}

export class AddWidgetDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  dashboardId!: string;

  @ApiProperty({ enum: ['chart', 'kpi', 'table', 'map', 'text', 'filter'] })
  @IsEnum(['chart', 'kpi', 'table', 'map', 'text', 'filter'])
  type!: 'chart' | 'kpi' | 'table' | 'map' | 'text' | 'filter';

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  title!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  config?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Arabic AI Engine DTOs
// ═══════════════════════════════════════════════════════

export class AnalyzeTextDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(50000)
  text!: string;

  @ApiPropertyOptional({ enum: ['ar', 'en', 'auto'] })
  @IsOptional() @IsEnum(['ar', 'en', 'auto'])
  language?: 'ar' | 'en' | 'auto';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  features?: string[];
}

export class TranslateDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(50000)
  text!: string;

  @ApiProperty({ enum: ['ar-en', 'en-ar'] })
  @IsEnum(['ar-en', 'en-ar'])
  direction!: 'ar-en' | 'en-ar';

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  domain?: string;
}

// ═══════════════════════════════════════════════════════
// Spreadsheet Intelligence DTOs
// ═══════════════════════════════════════════════════════

export class ParseSpreadsheetDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  fileId!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  sheetName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  inferFormulas?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  detectPivots?: boolean;
}

// ═══════════════════════════════════════════════════════
// CDR Engine DTOs
// ═══════════════════════════════════════════════════════

export class ProcessDocumentDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  documentId!: string;

  @ApiPropertyOptional({ enum: ['pdf', 'docx', 'xlsx', 'pptx', 'image', 'auto'] })
  @IsOptional() @IsEnum(['pdf', 'docx', 'xlsx', 'pptx', 'image', 'auto'])
  format?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  extractTables?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ocrEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['STRICT', 'PROFESSIONAL', 'HYBRID'] })
  @IsOptional() @IsEnum(['STRICT', 'PROFESSIONAL', 'HYBRID'])
  mode?: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';
}

// ═══════════════════════════════════════════════════════
// Auth DTOs
// ═══════════════════════════════════════════════════════

export class LoginDto {
  @ApiProperty() @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128)
  password!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  mfaCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  refreshToken!: string;
}

export class CreateUserDto extends TenantAwareDto {
  @ApiProperty() @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number and special char',
  })
  password!: string;

  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true })
  roles!: string[];
}

// ═══════════════════════════════════════════════════════
// Business Module DTOs (HRM, Finance, CRM, etc.)
// ═══════════════════════════════════════════════════════

export class CreateEmployeeDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @ApiProperty() @IsEmail()
  email!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  department?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  position?: string;
}

export class CreateTransactionDto extends TenantAwareDto {
  @ApiProperty({ enum: ['income', 'expense', 'transfer', 'journal'] })
  @IsEnum(['income', 'expense', 'transfer', 'journal'])
  type!: 'income' | 'expense' | 'transfer' | 'journal';

  @ApiProperty() @IsNumber() @Min(0.01)
  amount!: number;

  @ApiProperty() @IsString() @MaxLength(3)
  currency!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  accountId?: string;
}

export class CreateContactDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['lead', 'prospect', 'customer', 'partner'] })
  @IsOptional() @IsEnum(['lead', 'prospect', 'customer', 'partner'])
  type?: 'lead' | 'prospect' | 'customer' | 'partner';
}

// ═══════════════════════════════════════════════════════
// Workflow & Project DTOs
// ═══════════════════════════════════════════════════════

export class CreateWorkflowDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [Object] }) @IsArray() @ArrayMinSize(1)
  steps!: Array<{ name: string; type: string; config?: Record<string, unknown> }>;
}

export class CreateProjectDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  managerId?: string;
}

// ═══════════════════════════════════════════════════════
// Search & Filter DTOs
// ═══════════════════════════════════════════════════════

export class SearchDto extends PaginationDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500)
  query!: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  filters?: string[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  facets?: string[];
}

export class FileUploadDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255)
  filename!: string;

  @ApiProperty() @IsString()
  @Matches(/^(application|image|text|video|audio)\/[\w.+-]+$/)
  mimeType!: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5368709120) // 5GB
  @Type(() => Number)
  size?: number;
}

// ═══════════════════════════════════════════════════════
// Notification DTOs
// ═══════════════════════════════════════════════════════

export class SendNotificationDto extends TenantAwareDto {
  @ApiProperty({ enum: ['email', 'sms', 'push', 'in-app'] })
  @IsEnum(['email', 'sms', 'push', 'in-app'])
  channel!: 'email' | 'sms' | 'push' | 'in-app';

  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) @ArrayMinSize(1)
  recipients!: string[];

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  subject!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(10000)
  body!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Config & Governance DTOs
// ═══════════════════════════════════════════════════════

export class UpdateConfigDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  key!: string;

  @ApiProperty()
  value!: unknown;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  userId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  resource?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  from?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  to?: string;
}

// ═══════════════════════════════════════════════════════
// Legal Contract DTOs
// ═══════════════════════════════════════════════════════

export class CreateContractDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300)
  title!: string;

  @ApiProperty({ enum: ['service', 'procurement', 'employment', 'nda', 'lease', 'other'] })
  @IsEnum(['service', 'procurement', 'employment', 'nda', 'lease', 'other'])
  contractType!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300)
  counterpartyName!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  totalValue?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  effectiveDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  expirationDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  autoRenew?: boolean;

  @ApiProperty() @IsUUID()
  ownerId!: string;
}

// ═══════════════════════════════════════════════════════
// AI Orchestration DTOs
// ═══════════════════════════════════════════════════════

export class CreateAIModelDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['classification', 'regression', 'nlp', 'vision', 'generative'] })
  @IsEnum(['classification', 'regression', 'nlp', 'vision', 'generative'])
  type!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  endpoint?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  config?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Analytics & Reporting DTOs
// ═══════════════════════════════════════════════════════

export class CreateReportDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['table', 'chart', 'dashboard', 'export'] })
  @IsEnum(['table', 'chart', 'dashboard', 'export'])
  type!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  query?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  parameters?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Decision Engine DTOs
// ═══════════════════════════════════════════════════════

export class CreateDecisionRuleDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100)
  ruleSet!: string;

  @ApiProperty() @IsObject()
  conditions!: Record<string, unknown>;

  @ApiProperty() @IsObject()
  actions!: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000)
  priority?: number;
}

// ═══════════════════════════════════════════════════════
// Knowledge Graph DTOs
// ═══════════════════════════════════════════════════════

export class CreateKGNodeDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  label!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100)
  nodeType!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  properties?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Scheduler DTOs
// ═══════════════════════════════════════════════════════

export class CreateScheduledJobDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100)
  cronExpression!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  handler!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════
// Billing DTOs
// ═══════════════════════════════════════════════════════

export class CreateSubscriptionDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  planId!: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'] })
  @IsOptional() @IsEnum(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
}

// ═══════════════════════════════════════════════════════
// Tenant Management DTOs
// ═══════════════════════════════════════════════════════

export class CreateTenantDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200)
  name!: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional({ enum: ['trial', 'standard', 'enterprise'] })
  @IsOptional() @IsEnum(['trial', 'standard', 'enterprise'])
  tier?: 'trial' | 'standard' | 'enterprise';

  @ApiPropertyOptional() @IsOptional() @IsObject()
  settings?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Integration Hub DTOs
// ═══════════════════════════════════════════════════════

export class CreateIntegrationDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['rest', 'graphql', 'webhook', 'grpc', 'soap'] })
  @IsEnum(['rest', 'graphql', 'webhook', 'grpc', 'soap'])
  type!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500)
  endpoint!: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  authConfig?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Collaboration Hub DTOs
// ═══════════════════════════════════════════════════════

export class CreateCollaborationSpaceDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ['public', 'private', 'restricted'] })
  @IsOptional() @IsEnum(['public', 'private', 'restricted'])
  visibility?: 'public' | 'private' | 'restricted';

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  memberIds?: string[];
}

// ═══════════════════════════════════════════════════════
// Inventory DTOs
// ═══════════════════════════════════════════════════════

export class CreateItemDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(50)
  sku!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  category?: string;
}

// ═══════════════════════════════════════════════════════
// Procurement DTOs
// ═══════════════════════════════════════════════════════

export class CreatePurchaseOrderDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  vendorId!: string;

  @ApiProperty({ type: [Object] }) @IsArray() @ArrayMinSize(1)
  items!: Array<{ itemId: string; quantity: number; unitPrice: number }>;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601()
  deliveryDate?: string;
}

// ═══════════════════════════════════════════════════════
// Compliance DTOs
// ═══════════════════════════════════════════════════════

export class RunComplianceCheckDto extends TenantAwareDto {
  @ApiProperty() @IsUUID()
  frameworkId!: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  moduleScope?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  fullScan?: boolean;
}

// ═══════════════════════════════════════════════════════
// Dev Portal DTOs
// ═══════════════════════════════════════════════════════

export class RegisterAppDto extends TenantAwareDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  redirectUris?: string[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  scopes?: string[];
}

// ═══════════════════════════════════════════════════════
// Paginated Response Wrapper
// ═══════════════════════════════════════════════════════

export class PaginatedResponse<T> {
  data!: T[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  static create<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
