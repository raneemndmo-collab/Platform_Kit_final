// Rasid v6.4 — JWT Key Rotation — SEC-008 Fix
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface JWTKeyPair {
  kid: string;           // Key ID for rotation
  publicKey: string;     // RSA public key (PEM)
  privateKey: string;    // RSA private key (PEM)
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

@Injectable()
export class JWTKeyRotationService {
  private readonly logger = new Logger(JWTKeyRotationService.name);
  private keys: JWTKeyPair[] = [];
  private readonly KEY_LIFETIME_DAYS = 90;
  private readonly OVERLAP_DAYS = 7; // Allow old keys for 7 days after rotation

  async initialize(): Promise<void> {
    if (this.keys.length === 0) {
      await this.generateNewKeyPair();
    }
  }

  async generateNewKeyPair(): Promise<JWTKeyPair> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.KEY_LIFETIME_DAYS * 86400000);

    const keyPair: JWTKeyPair = {
      kid, publicKey, privateKey,
      createdAt: now, expiresAt, active: true,
    };

    // Deactivate old keys (but keep for verification during overlap period)
    for (const key of this.keys) {
      key.active = false;
    }

    this.keys.push(keyPair);
    this.logger.log(`New JWT key pair generated: kid=${kid}, expires=${expiresAt.toISOString()}`);

    // Cleanup expired keys beyond overlap period
    const cutoff = new Date(now.getTime() - this.OVERLAP_DAYS * 86400000);
    this.keys = this.keys.filter(k => k.expiresAt > cutoff || k.active);

    return keyPair;
  }

  getActiveKey(): JWTKeyPair | null {
    return this.keys.find(k => k.active) || null;
  }

  getKeyById(kid: string): JWTKeyPair | null {
    return this.keys.find(k => k.kid === kid) || null;
  }

  // JWKS endpoint format
  getJWKS(): { keys: Array<{ kid: string; kty: string; use: string; alg: string; n: string; e: string }> } {
    return {
      keys: this.keys
        .filter(k => k.active || k.expiresAt > new Date())
        .map(k => ({
          kid: k.kid,
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          n: this.extractModulus(k.publicKey),
          e: 'AQAB',
        })),
    };
  }

  shouldRotate(): boolean {
    const active = this.getActiveKey();
    if (!active) return true;
    const daysLeft = (active.expiresAt.getTime() - Date.now()) / 86400000;
    return daysLeft <= this.OVERLAP_DAYS;
  }

  private extractModulus(publicKeyPem: string): string {
    // Simplified — in production use jose library
    const der = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\n/g, '');
    return der.slice(0, 64) + '...'; // Truncated for display
  }
}
