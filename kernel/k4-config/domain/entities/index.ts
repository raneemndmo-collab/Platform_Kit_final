// =============================================================================
// K4: Configuration Kernel — Domain Entities
// Constitutional Reference: P-003 (Data Sovereignty), K4 Contract
// Database: config_db (exclusive, 0 shared access)
// =============================================================================

import { Entity, Column, Index, Unique } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('configurations')
@Unique(['tenantId', 'moduleId', 'key', 'environment'])
@Index('idx_config_module_env', ['moduleId', 'environment'])
export class ConfigurationEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 32 })
  moduleId!: string;

  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'varchar', length: 32, default: 'string' })
  valueType!: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'varchar', length: 32, default: 'production' })
  environment!: string;

  @Column({ type: 'boolean', default: false })
  encrypted!: boolean;

  @Column({ type: 'varchar', length: 32, default: 'default' })
  source!: 'default' | 'environment' | 'override' | 'tenant';

  @Column({ type: 'text', nullable: true })
  description?: string;
}

@Entity('feature_flags')
@Unique(['tenantId', 'name'])
@Index('idx_feature_module', ['moduleId'])
export class FeatureFlagEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'varchar', length: 32 })
  moduleId!: string;

  @Column({ type: 'jsonb', default: '{}' })
  tenantOverrides!: Record<string, boolean>;

  @Column({ type: 'int', default: 0 })
  rolloutPercentage!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

@Entity('environment_profiles')
@Unique(['tenantId', 'name'])
export class EnvironmentProfileEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  variables!: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
