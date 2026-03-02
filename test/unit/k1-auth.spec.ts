// =============================================================================
// K1: Authentication — Unit Tests
// Tests: Registration, login, token validation, session management
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { K1AuthService } from '../../kernel/k1-auth/application/handlers/auth.service';
import { UserEntity, SessionEntity, ApiKeyEntity } from '../../kernel/k1-auth/domain/entities';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto: any) => ({ ...dto, id: 'test-id' })),
  save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: entity.id || 'test-id' })),
  delete: jest.fn(),
});

describe('K1AuthService', () => {
  let service: K1AuthService;
  let userRepo: any;
  let sessionRepo: any;
  let jwtService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K1AuthService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(SessionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ApiKeyEntity), useFactory: mockRepo },
        { provide: JwtService, useValue: {
          sign: jest.fn().mockReturnValue('mock-jwt-token'),
          verify: jest.fn().mockReturnValue({ sub: 'user1', tenantId: 't1' }),
        }},
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(K1AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    sessionRepo = module.get(getRepositoryToken(SessionEntity));
    jwtService = module.get(JwtService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.register('t1', {
        email: 'test@example.com', password: 'secure123', displayName: 'Test User',
      });

      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auth.user.registered', expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should reject duplicate email per tenant', async () => {
      userRepo.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(service.register('t1', {
        email: 'test@example.com', password: 'secure123', displayName: 'Test',
      })).rejects.toThrow('already exists');
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user1', tenantId: 't1', email: 'test@example.com',
      passwordHash: 'hashed', roles: ['user'], status: 'active',
      failedLoginAttempts: 0, lockedUntil: null,
    };

    it('should login with valid credentials', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('session-hash');

      const result = await service.login('t1', {
        email: 'test@example.com', password: 'secure123',
        ipAddress: '127.0.0.1', userAgent: 'test',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('auth.session.created', expect.anything());
    });

    it('should reject invalid credentials', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('t1', {
        email: 'test@example.com', password: 'wrong',
        ipAddress: '127.0.0.1', userAgent: 'test',
      })).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login('t1', {
        email: 'missing@example.com', password: 'any',
        ipAddress: '127.0.0.1', userAgent: 'test',
      })).rejects.toThrow('Invalid credentials');
    });

    it('should lock account after 5 failed attempts', async () => {
      const user = { ...mockUser, failedLoginAttempts: 4 };
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('t1', {
        email: 'test@example.com', password: 'wrong',
        ipAddress: '127.0.0.1', userAgent: 'test',
      })).rejects.toThrow('Invalid credentials');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'locked', failedLoginAttempts: 5 }),
      );
    });

    it('should reject locked account', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000),
      });

      await expect(service.login('t1', {
        email: 'test@example.com', password: 'any',
        ipAddress: '127.0.0.1', userAgent: 'test',
      })).rejects.toThrow('locked');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid JWT token', async () => {
      const result = await service.validateToken('valid-token');
      expect(result).toEqual({ sub: 'user1', tenantId: 't1' });
    });

    it('should reject invalid token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      await expect(service.validateToken('bad-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should deactivate session', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 'session1', isActive: true });

      await service.logout('t1', 'session1');
      expect(sessionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('auth.session.destroyed', expect.anything());
    });
  });
});
