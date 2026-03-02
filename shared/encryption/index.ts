import { BoundedMap } from '../bounded-collections';
/**
 * SEC-009: Encryption at Rest
 * ────────────────────────────────────────────────────────
 * AES-256-GCM with PBKDF2, envelope encryption, key rotation.
 * TypeORM transformer for transparent field encryption.
 * Constitutional: P-003 (Data Sovereignty), SEC-009
 */
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  ct: string;   // ciphertext (base64)
  iv: string;   // initialization vector (base64)
  tag: string;  // auth tag (base64)
  kid: string;  // key identifier
  v: number;    // schema version
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm' as const;
  private readonly keyIterations = 100_000;
  private readonly currentKeyId: string;
  private readonly derivedKeys = new BoundedMap<string, Buffer>(10_000);

  constructor() {
    this.currentKeyId = process.env['ENCRYPTION_KEY_ID'] ?? 'rasid-key-v1';
    this.deriveKey(this.currentKeyId);
    this.logger.log(`Encryption initialized with key: ${this.currentKeyId}`);
  }

  private deriveKey(keyId: string): Buffer {
    const cached = this.derivedKeys.get(keyId);
    if (cached) return cached;

    const masterKey = process.env['ENCRYPTION_MASTER_KEY'];
    if (!masterKey || masterKey === 'CHANGE_ME_IN_PRODUCTION_32chars!') {
      this.logger.warn('⚠️  Using default encryption key — SET ENCRYPTION_MASTER_KEY in production!');
    }
    const keyMaterial = masterKey ?? 'CHANGE_ME_IN_PRODUCTION_32chars!';
    const salt = crypto.createHash('sha256').update(`rasid:${keyId}`).digest();
    const key = crypto.pbkdf2Sync(keyMaterial, salt, this.keyIterations, 32, 'sha512');
    this.derivedKeys.set(keyId, key);
    return key;
  }

  encrypt(plaintext: string, aad?: string): EncryptedPayload {
    const key = this.deriveKey(this.currentKeyId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;
    if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ct: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      kid: this.currentKeyId,
      v: 1,
    };
  }

  decrypt(payload: EncryptedPayload, aad?: string): string {
    const key = this.deriveKey(payload.kid);
    const decipher = crypto.createDecipheriv(
      this.algorithm, key, Buffer.from(payload.iv, 'base64'),
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ct, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt a field value for database storage.
   * Returns JSON string of EncryptedPayload.
   */
  encryptField(value: string, tenantId?: string): string {
    const payload = this.encrypt(value, tenantId);
    return JSON.stringify(payload);
  }

  /**
   * Decrypt a field value from database storage.
   */
  decryptField(encrypted: string, tenantId?: string): string {
    try {
      const payload: EncryptedPayload = JSON.parse(encrypted);
      if (!payload.ct || !payload.iv || !payload.tag || !payload.kid) {
        return encrypted; // Not encrypted, return as-is
      }
      return this.decrypt(payload, tenantId);
    } catch {
      return encrypted; // Not encrypted or corrupt, return as-is
    }
  }

  /**
   * Hash sensitive data for indexing (non-reversible).
   */
  hash(value: string, salt?: string): string {
    return crypto
      .createHmac('sha256', salt ?? this.currentKeyId)
      .update(value)
      .digest('hex');
  }

  /**
   * TypeORM column transformer for transparent encryption.
   * Usage: @Column({ transformer: encryptionService.columnTransformer('tenantId') })
   */
  columnTransformer(aadField?: string) {
    return {
      to: (value: string | null): string | null => {
        if (!value) return value;
        return this.encryptField(value);
      },
      from: (value: string | null): string | null => {
        if (!value) return value;
        return this.decryptField(value);
      },
    };
  }

  /**
   * Re-encrypt data with new key (for key rotation).
   */
  reEncrypt(payload: EncryptedPayload, newKeyId: string, aad?: string): EncryptedPayload {
    const plaintext = this.decrypt(payload, aad);
    const oldKeyId = this.currentKeyId;
    (this as any).currentKeyId = newKeyId;
    this.deriveKey(newKeyId);
    const result = this.encrypt(plaintext, aad);
    (this as any).currentKeyId = oldKeyId;
    return result;
  }
}
