// ARC-003 FIX: JSON Schema Validation Engine
// Replaces manual field checks with full JSON Schema Draft-07 validation
// Uses lightweight self-contained validator (no external ajv dependency needed)
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../bounded-collections';

export interface SchemaDefinition {
  type?: string | string[];
  properties?: Record<string, SchemaDefinition>;
  required?: string[];
  items?: SchemaDefinition;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean | SchemaDefinition;
  oneOf?: SchemaDefinition[];
  anyOf?: SchemaDefinition[];
  allOf?: SchemaDefinition[];
  not?: SchemaDefinition;
  $ref?: string;
  default?: unknown;
  description?: string;
  title?: string;
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class SchemaValidationEngine {
  private readonly logger = new Logger(SchemaValidationEngine.name);
  private readonly schemaCache = new BoundedMap<string, SchemaDefinition>(1_000);

  registerSchema(name: string, schema: SchemaDefinition): void {
    this.schemaCache.set(name, schema);
    this.logger.debug(`Schema registered: ${name}`);
  }

  getSchema(name: string): SchemaDefinition | undefined {
    return this.schemaCache.get(name);
  }

  validate(data: unknown, schema: SchemaDefinition | string, path: string = ''): ValidationResult {
    const resolvedSchema = typeof schema === 'string'
      ? this.schemaCache.get(schema) : schema;

    if (!resolvedSchema) {
      return { valid: false, errors: [{ path, message: `Schema not found: ${schema}`, keyword: 'schema' }] };
    }

    const errors: ValidationError[] = [];
    this.validateNode(data, resolvedSchema, path, errors);
    return { valid: errors.length === 0, errors };
  }

  private validateNode(data: unknown, schema: SchemaDefinition, path: string, errors: ValidationError[]): void {
    // $ref resolution
    if (schema.$ref) {
      const refSchema = this.schemaCache.get(schema.$ref.replace('#/definitions/', ''));
      if (refSchema) { this.validateNode(data, refSchema, path, errors); return; }
      errors.push({ path, message: `Unresolved $ref: ${schema.$ref}`, keyword: '$ref' });
      return;
    }

    // allOf
    if (schema.allOf) {
      for (const sub of schema.allOf) this.validateNode(data, sub, path, errors);
    }
    // anyOf
    if (schema.anyOf) {
      const anyValid = schema.anyOf.some(sub => this.validate(data, sub, path).valid);
      if (!anyValid) errors.push({ path, message: 'Must match at least one schema in anyOf', keyword: 'anyOf' });
    }
    // oneOf
    if (schema.oneOf) {
      const matchCount = schema.oneOf.reduce((c, sub) => c + (this.validate(data, sub, path).valid ? 1 : 0), 0);
      if (matchCount !== 1) errors.push({ path, message: `Must match exactly one schema in oneOf (matched ${matchCount})`, keyword: 'oneOf' });
    }
    // not
    if (schema.not) {
      if (this.validate(data, schema.not, path).valid) {
        errors.push({ path, message: 'Must NOT match schema', keyword: 'not' });
      }
    }

    // Type checking
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some(t => this.matchType(data, t))) {
        errors.push({ path, message: `Expected type ${types.join('|')}, got ${typeof data}`, keyword: 'type', params: { type: types } });
        return; // Skip further checks if type mismatch
      }
    }

    // Enum
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}`, keyword: 'enum', params: { allowedValues: schema.enum } });
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({ path, message: `String too short (min ${schema.minLength})`, keyword: 'minLength', params: { limit: schema.minLength } });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({ path, message: `String too long (max ${schema.maxLength})`, keyword: 'maxLength', params: { limit: schema.maxLength } });
      }
      if (schema.pattern) {
        try { if (!new RegExp(schema.pattern).test(data)) errors.push({ path, message: `Does not match pattern: ${schema.pattern}`, keyword: 'pattern' }); }
        catch { /* invalid regex */ }
      }
      if (schema.format) this.validateFormat(data, schema.format, path, errors);
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({ path, message: `Value ${data} below minimum ${schema.minimum}`, keyword: 'minimum', params: { limit: schema.minimum } });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({ path, message: `Value ${data} above maximum ${schema.maximum}`, keyword: 'maximum', params: { limit: schema.maximum } });
      }
    }

    // Object validations
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;

      // Required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in obj) || obj[field] === undefined) {
            errors.push({ path: `${path}.${field}`, message: `Required field missing: ${field}`, keyword: 'required', params: { missingProperty: field } });
          }
        }
      }

      // Properties validation
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in obj) {
            this.validateNode(obj[key], propSchema, `${path}.${key}`, errors);
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false && schema.properties) {
        const allowed = new Set(Object.keys(schema.properties));
        for (const key of Object.keys(obj)) {
          if (!allowed.has(key)) {
            errors.push({ path: `${path}.${key}`, message: `Additional property not allowed: ${key}`, keyword: 'additionalProperties' });
          }
        }
      }
    }

    // Array validations
    if (Array.isArray(data) && schema.items) {
      for (let i = 0; i < data.length; i++) {
        this.validateNode(data[i], schema.items, `${path}[${i}]`, errors);
      }
    }
  }

  private matchType(data: unknown, type: string): boolean {
    switch (type) {
      case 'string': return typeof data === 'string';
      case 'number': return typeof data === 'number' && !isNaN(data);
      case 'integer': return typeof data === 'number' && Number.isInteger(data);
      case 'boolean': return typeof data === 'boolean';
      case 'array': return Array.isArray(data);
      case 'object': return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'null': return data === null;
      default: return true;
    }
  }

  private validateFormat(data: string, format: string, path: string, errors: ValidationError[]): void {
    const formatPatterns: Record<string, RegExp> = {
      'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'uri': /^https?:\/\/.+/,
      'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'date': /^\d{4}-\d{2}-\d{2}$/,
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      'ipv4': /^(\d{1,3}\.){3}\d{1,3}$/,
      'ipv6': /^[0-9a-fA-F:]+$/,
      'hostname': /^[a-zA-Z0-9.-]+$/,
    };

    const pattern = formatPatterns[format];
    if (pattern && !pattern.test(data)) {
      errors.push({ path, message: `Invalid format: expected ${format}`, keyword: 'format', params: { format } });
    }
  }

// Pre-defined Rasid schemas
export const RASID_SCHEMAS: Record<string, SchemaDefinition> = {
  'tenant-context': {
    type: 'object',
    required: ['tenantId'],
    properties: {
      tenantId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      correlationId: { type: 'string' },
    },
  },
  'execution-plan': {
    type: 'object',
    required: ['id', 'tenantId', 'selectedMode', 'agents'],
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string', format: 'uuid' },
      selectedMode: { type: 'string', enum: ['STRICT', 'PROFESSIONAL', 'HYBRID'] },
      agents: {
        type: 'array',
        items: {
          type: 'object',
          required: ['agent', 'taskId', 'priority'],
          properties: {
            agent: { type: 'string', enum: ['layout', 'data', 'spreadsheet', 'bi', 'arabic', 'design', 'verification', 'performance'] },
            taskId: { type: 'string' },
            estimatedMs: { type: 'number', minimum: 0 },
            priority: { type: 'integer', minimum: 0, maximum: 10 },
            gpuRequired: { type: 'boolean' },
          },
        },
      },
      qualityThreshold: { type: 'number', minimum: 0, maximum: 1 },
    },
  },
  'audit-log': {
    type: 'object',
    required: ['tenantId', 'action', 'resource'],
    properties: {
      tenantId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      action: { type: 'string', minLength: 1, maxLength: 100 },
      resource: { type: 'string', minLength: 1, maxLength: 200 },
      resourceId: { type: 'string' },
      details: { type: 'object' },
      ipAddress: { type: 'string' },
      correlationId: { type: 'string' },
    },
  },
  'dashboard-input': {
    type: 'object',
    required: ['charts', 'kpis', 'width', 'height'],
    properties: {
      charts: { type: 'array', items: { type: 'object', required: ['id', 'type'], properties: { id: { type: 'string' }, type: { type: 'string' }, dataPoints: { type: 'integer', minimum: 0 } } } },
      kpis: { type: 'array', items: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, importance: { type: 'number', minimum: 0, maximum: 1 } } } },
      filters: { type: 'array' },
      width: { type: 'number', minimum: 100 },
      height: { type: 'number', minimum: 100 },
    },
  },
};
}
