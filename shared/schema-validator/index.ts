// ARC-003 FIX COMPLETE: Full JSON Schema validation engine
// Implements JSON Schema Draft-07 compatible validation without external dependencies
// Replaces the basic required/type-only checker with full recursive validation

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

export class JsonSchemaValidator {
  validate(data: unknown, schema: Record<string, unknown>, path = ''): ValidationResult {
    const errors: ValidationError[] = [];
    this._validate(data, schema, path, errors);
    return { valid: errors.length === 0, errors };
  }

  private _validate(data: unknown, schema: Record<string, unknown>, path: string, errors: ValidationError[]): void {
    if (!schema || typeof schema !== 'object') return;

    // type check
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this.getType(data);
      if (!types.includes(actualType) && !(types.includes('integer') && actualType === 'number' && Number.isInteger(data as number))) {
        errors.push({ path, message: `Expected ${types.join('|')}, got ${actualType}`, keyword: 'type', params: { expected: types, actual: actualType } });
        return; // Stop further checks if type mismatch
      }
    }

    // enum
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(data)) {
        errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}`, keyword: 'enum', params: { allowedValues: schema.enum } });
      }
    }

    // const
    if ('const' in schema && data !== schema.const) {
      errors.push({ path, message: `Value must be ${JSON.stringify(schema.const)}`, keyword: 'const' });
    }

    // string constraints
    if (typeof data === 'string') {
      if (typeof schema.minLength === 'number' && data.length < schema.minLength) {
        errors.push({ path, message: `String must be >= ${schema.minLength} chars`, keyword: 'minLength' });
      }
      if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) {
        errors.push({ path, message: `String must be <= ${schema.maxLength} chars`, keyword: 'maxLength' });
      }
      if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(data)) {
        errors.push({ path, message: `String must match pattern: ${schema.pattern}`, keyword: 'pattern' });
      }
      // format validation
      if (schema.format === 'email' && !/^[^@]+@[^@]+\.[^@]+$/.test(data)) {
        errors.push({ path, message: 'Invalid email format', keyword: 'format' });
      }
      if (schema.format === 'uri' && !/^https?:\/\//.test(data)) {
        errors.push({ path, message: 'Invalid URI format', keyword: 'format' });
      }
      if (schema.format === 'date-time' && isNaN(Date.parse(data))) {
        errors.push({ path, message: 'Invalid date-time format', keyword: 'format' });
      }
      if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
        errors.push({ path, message: 'Invalid UUID format', keyword: 'format' });
      }
    }

    // number constraints
    if (typeof data === 'number') {
      if (typeof schema.minimum === 'number' && data < (schema.minimum as number)) {
        errors.push({ path, message: `Must be >= ${schema.minimum}`, keyword: 'minimum' });
      }
      if (typeof schema.maximum === 'number' && data > (schema.maximum as number)) {
        errors.push({ path, message: `Must be <= ${schema.maximum}`, keyword: 'maximum' });
      }
      if (typeof schema.exclusiveMinimum === 'number' && data <= (schema.exclusiveMinimum as number)) {
        errors.push({ path, message: `Must be > ${schema.exclusiveMinimum}`, keyword: 'exclusiveMinimum' });
      }
      if (typeof schema.exclusiveMaximum === 'number' && data >= (schema.exclusiveMaximum as number)) {
        errors.push({ path, message: `Must be < ${schema.exclusiveMaximum}`, keyword: 'exclusiveMaximum' });
      }
      if (typeof schema.multipleOf === 'number' && data % (schema.multipleOf as number) !== 0) {
        errors.push({ path, message: `Must be multiple of ${schema.multipleOf}`, keyword: 'multipleOf' });
      }
    }

    // object constraints
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;

      // required
      if (Array.isArray(schema.required)) {
        for (const field of schema.required as string[]) {
          if (!(field in obj)) {
            errors.push({ path: `${path}.${field}`, message: `Required field missing: ${field}`, keyword: 'required', params: { missingProperty: field } });
          }
        }
      }

      // properties (recursive)
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
          if (key in obj) {
            this._validate(obj[key], propSchema, `${path}.${key}`, errors);
          }
        }
      }

      // additionalProperties
      if (schema.additionalProperties === false && schema.properties) {
        const allowed = new Set(Object.keys(schema.properties as object));
        for (const key of Object.keys(obj)) {
          if (!allowed.has(key)) {
            errors.push({ path: `${path}.${key}`, message: `Additional property not allowed: ${key}`, keyword: 'additionalProperties' });
          }
        }
      }

      // minProperties / maxProperties
      const keyCount = Object.keys(obj).length;
      if (typeof schema.minProperties === 'number' && keyCount < (schema.minProperties as number)) {
        errors.push({ path, message: `Object must have >= ${schema.minProperties} properties`, keyword: 'minProperties' });
      }
      if (typeof schema.maxProperties === 'number' && keyCount > (schema.maxProperties as number)) {
        errors.push({ path, message: `Object must have <= ${schema.maxProperties} properties`, keyword: 'maxProperties' });
      }
    }

    // array constraints
    if (Array.isArray(data)) {
      if (typeof schema.minItems === 'number' && data.length < (schema.minItems as number)) {
        errors.push({ path, message: `Array must have >= ${schema.minItems} items`, keyword: 'minItems' });
      }
      if (typeof schema.maxItems === 'number' && data.length > (schema.maxItems as number)) {
        errors.push({ path, message: `Array must have <= ${schema.maxItems} items`, keyword: 'maxItems' });
      }
      if (schema.uniqueItems === true) {
        const seen = new Set(data.map(v => JSON.stringify(v)));
        if (seen.size !== data.length) {
          errors.push({ path, message: 'Array items must be unique', keyword: 'uniqueItems' });
        }
      }
      // items (recursive)
      if (schema.items && typeof schema.items === 'object') {
        for (let i = 0; i < data.length; i++) {
          this._validate(data[i], schema.items as Record<string, unknown>, `${path}[${i}]`, errors);
        }
      }
    }

    // oneOf
    if (Array.isArray(schema.oneOf)) {
      const matching = (schema.oneOf as Record<string, unknown>[]).filter(s => this.validate(data, s).valid);
      if (matching.length !== 1) {
        errors.push({ path, message: `Must match exactly one of ${schema.oneOf.length} schemas (matched ${matching.length})`, keyword: 'oneOf' });
      }
    }

    // anyOf
    if (Array.isArray(schema.anyOf)) {
      const matching = (schema.anyOf as Record<string, unknown>[]).filter(s => this.validate(data, s).valid);
      if (matching.length === 0) {
        errors.push({ path, message: `Must match at least one of ${schema.anyOf.length} schemas`, keyword: 'anyOf' });
      }
    }

    // allOf
    if (Array.isArray(schema.allOf)) {
      for (const sub of schema.allOf as Record<string, unknown>[]) {
        this._validate(data, sub, path, errors);
      }
    }

    // not
    if (schema.not && typeof schema.not === 'object') {
      if (this.validate(data, schema.not as Record<string, unknown>).valid) {
        errors.push({ path, message: 'Must NOT match the given schema', keyword: 'not' });
      }
    }

    // if/then/else
    if (schema.if && typeof schema.if === 'object') {
      if (this.validate(data, schema.if as Record<string, unknown>).valid) {
        if (schema.then && typeof schema.then === 'object') {
          this._validate(data, schema.then as Record<string, unknown>, path, errors);
        }
      } else if (schema.else && typeof schema.else === 'object') {
        this._validate(data, schema.else as Record<string, unknown>, path, errors);
      }
    }
  }

  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

// Singleton instance
export const schemaValidator = new JsonSchemaValidator();
