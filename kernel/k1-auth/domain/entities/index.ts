// =============================================================================
// K1: Authentication Kernel — Complete Implementation
// Constitutional Reference: K1 Contract, P-016 (Tenant Isolation)
// Responsibility: Credential management, session lifecycle, token issuance, MFA
// Database: auth_db (exclusive)
// Event Namespace: auth.*
// API Surface: /api/v1/auth/*
// =============================================================================

// --- Domain Entities ---
import { Entity, Column, Index, Unique } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('users')
@Unique(['tenantId', 'email'])
@Index('idx_user_email', ['email'])
export class UserEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 256 })
  email!: string;

  @Column({ type: 'varchar', length: 512 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 128 })
  displayName!: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'active' | 'suspended' | 'locked' | 'pending';

  @Column({ type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 256, nullable: true })
  mfaSecret?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'jsonb', default: '[]' })
  roles!: string[];
}

@Entity('sessions')
@Index('idx_session_user', ['userId'])
@Index('idx_session_token', ['tokenHash'])
@Index('idx_session_expires', ['expiresAt'])
export class SessionEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 512 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  refreshTokenHash?: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  refreshExpiresAt?: Date;

  @Column({ type: 'varchar', length: 64 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 512 })
  userAgent!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}

@Entity('api_keys')
@Unique(['tenantId', 'keyHash'])
export class ApiKeyEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 512 })
  keyHash!: string;

  @Column({ type: 'varchar', length: 16 })
  keyPrefix!: string;

  @Column({ type: 'jsonb', default: '[]' })
  scopes!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;
}

export { UserEntity, SessionEntity, ApiKeyEntity };
