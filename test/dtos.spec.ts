/**
 * B2: DTO Validation Tests
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto, CreateExecutionPlanDto, PaginationDto, WhatIfScenarioDto } from '../shared/dtos';

describe('DTO Validation', () => {
  describe('LoginDto', () => {
    it('should validate valid login', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'admin@rasid.gov.sa',
        password: 'Str0ng!Pass',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid email', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'not-an-email',
        password: 'Str0ng!Pass',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject short password', async () => {
      const dto = plainToInstance(LoginDto, {
        email: 'admin@rasid.gov.sa',
        password: '123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('PaginationDto', () => {
    it('should have defaults', async () => {
      const dto = plainToInstance(PaginationDto, {});
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('should reject invalid page', async () => {
      const dto = plainToInstance(PaginationDto, { page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject too large limit', async () => {
      const dto = plainToInstance(PaginationDto, { limit: 500 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateExecutionPlanDto', () => {
    it('should validate valid plan', async () => {
      const dto = plainToInstance(CreateExecutionPlanDto, {
        input: 'Process this document',
        mode: 'STRICT',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject empty input', async () => {
      const dto = plainToInstance(CreateExecutionPlanDto, {
        input: '',
        mode: 'STRICT',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid mode', async () => {
      const dto = plainToInstance(CreateExecutionPlanDto, {
        input: 'test',
        mode: 'INVALID',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('WhatIfScenarioDto', () => {
    it('should validate valid scenario', async () => {
      const dto = plainToInstance(WhatIfScenarioDto, {
        baseDataId: '550e8400-e29b-41d4-a716-446655440000',
        variable: 'revenue',
        changePercent: 15,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject extreme change percent', async () => {
      const dto = plainToInstance(WhatIfScenarioDto, {
        baseDataId: '550e8400-e29b-41d4-a716-446655440000',
        variable: 'revenue',
        changePercent: 5000,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
