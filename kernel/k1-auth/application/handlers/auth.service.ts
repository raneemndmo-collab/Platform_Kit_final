// =============================================================================
// K1: Authentication — Application Service
// =============================================================================

import {
  Injectable, Logger, UnauthorizedException, ConflictException,
  NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, SessionEntity, ApiKeyEntity } from '../domain/entities';
import { transactional } from '../../../../shared/transaction';

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
  // SEC-003: roles REMOVED — users NEVER self-assign roles. Use K2 assignRole() by admin.
}

export interface LoginDto {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class K1AuthService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K1AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private readonly ACCESS_TOKEN_TTL = 3600; // 1 hour
  private readonly REFRESH_TOKEN_TTL = 86400 * 7; // 7 days

  constructor(
    @InjectRepository(UserEntity, 'k1_connection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SessionEntity, 'k1_connection')
    private readonly sessionRepo: Repository<SessionEntity>,
    @InjectRepository(ApiKeyEntity, 'k1_connection')
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async register(tenantId: string, dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    // SEC-009 FIX: Enforce password policy
    this.validatePasswordPolicy(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = this.userRepo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      roles: ['user'], // SEC-003 FIX: Always 'user' only. Admin roles via K2 assignRole().
      status: 'active',
      createdBy: 'system',
      updatedBy: 'system',
    });

    const saved = await this.userRepo.save(user);
    try { this.safeEmit('auth.user.registered', {
      userId: saved.id, tenantId, email: dto.email,
    }); } catch (e) { /* PERF-003: Safe emit */ }
    return saved;
  }

  async login(tenantId: string, dto: LoginDto): Promise<AuthTokens> {
    const user = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked. Try again later.');
    }

    // Verify password
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
        user.status = 'locked';
        user.lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MS);
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // ARC-005 FIX: Transaction boundary — user update + session creation are atomic
    const sessionId = uuidv4();
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId,
      roles: user.roles,
      sessionId,
    });

    await transactional(this.dataSource, async (manager) => {
      // Reset failed attempts on success
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLoginAt = new Date();
      user.status = 'active';
      await manager.getRepository(UserEntity).save(user);

      // Create session in same transaction
      const session = manager.getRepository(SessionEntity).create({
        id: sessionId,
        tenantId,
        userId: user.id,
        tokenHash: await bcrypt.hash(tokens.accessToken.slice(-32), 6),
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken.slice(-32), 6),
        expiresAt: new Date(Date.now() + this.ACCESS_TOKEN_TTL * 1000),
        refreshExpiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL * 1000),
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      });
      await manager.getRepository(SessionEntity).save(session);
    });

    try { this.safeEmit('auth.session.created', {
      userId: user.id, tenantId, sessionId,
    });

    } catch (e) { /* PERF-003: Event emit errors must not break login */ }
    this.logger.log(`User logged in: ${user.email} [tenant: ${tenantId}]`);
    return tokens;
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      return this.jwtService.verify<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async logout(tenantId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId },
    });
    if (session) {
      session.isActive = false;
      await this.sessionRepo.save(session);
      this.safeEmit('auth.session.destroyed', { sessionId, tenantId });
    }
  }

  async getUserById(tenantId: string, userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: userId, tenantId } });
  }

  async listUsers(tenantId: string): Promise<UserEntity[]> {
    return this.userRepo.find({
      where: { tenantId },
      select: ['id', 'tenantId', 'email', 'displayName', 'status', 'roles', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepo.delete({
      expiresAt: LessThan(new Date()),
      isActive: true,
    });
    return result.affected || 0;
  }

  // SEC-009: Password policy enforcement
  private validatePasswordPolicy(password: string): void {
    if (!password || password.length < 12) {
      throw new ConflictException('Password must be at least 12 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ConflictException('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      throw new ConflictException('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      throw new ConflictException('Password must contain at least one number.');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new ConflictException('Password must contain at least one special character.');
    }
  }

  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, tenantId: payload.tenantId, sessionId: payload.sessionId, type: 'refresh' },
      { expiresIn: this.REFRESH_TOKEN_TTL },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
    };
  }
}
