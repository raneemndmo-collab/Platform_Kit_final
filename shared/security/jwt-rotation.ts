// Rasid v6.4 — JWT Key Rotation — SEC-008 Fix
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface JwtKeyPair {
  kid: string;
  privateKey: string;
  publicKey: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

@Injectable()
export class JwtKeyRotationService {
  private readonly logger = new Logger(JwtKeyRotationService.name);
  private keys: JwtKeyPair[] = [];
  private readonly KEY_LIFETIME_HOURS = 24;
  private readonly MAX_KEYS = 3; // Current + 2 previous for grace period

  constructor() {
    this.rotateKey(); // Generate initial key
  }

  /**
   * SEC-008: Generate new RSA key pair and rotate
   */
  rotateKey(): JwtKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.KEY_LIFETIME_HOURS * 3600000);

    // Deactivate all previous keys
    this.keys.forEach(k => k.active = false);

    const newKey: JwtKeyPair = {
      kid, privateKey, publicKey, createdAt: now, expiresAt, active: true,
    };

    this.keys.unshift(newKey);

    // Remove expired keys beyond retention
    if (this.keys.length > this.MAX_KEYS) {
      this.keys = this.keys.slice(0, this.MAX_KEYS);
    }

    this.logger.log(`JWT key rotated: kid=${kid}, expires=${expiresAt.toISOString()}`);
    return newKey;
  }

  /**
   * Get active signing key
   */
  getSigningKey(): JwtKeyPair {
    const active = this.keys.find(k => k.active);
    if (!active || active.expiresAt < new Date()) {
      return this.rotateKey();
    }
    return active;
  }

  /**
   * Get verification key by kid (supports grace period for recent keys)
   */
  getVerificationKey(kid: string): JwtKeyPair | null {
    return this.keys.find(k => k.kid === kid) || null;
  }

  /**
   * JWKS endpoint response format
   */
  getJWKS(): { keys: Array<{ kid: string; kty: string; use: string; n: string; e: string }> } {
    return {
      keys: this.keys.map(k => ({
        kid: k.kid,
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        n: this.extractModulus(k.publicKey),
        e: 'AQAB',
      })),
    };
  }

  private extractModulus(publicKeyPem: string): string {
    // Extract the base64 portion of the PEM
    const lines = publicKeyPem.split('\n').filter(l => !l.startsWith('-----'));
    return lines.join('').replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' }[m] || m));
  }

  /**
   * Check if rotation is needed (called by cron)
   */
  shouldRotate(): boolean {
    const active = this.keys.find(k => k.active);
    if (!active) return true;
    const hoursUntilExpiry = (active.expiresAt.getTime() - Date.now()) / 3600000;
    return hoursUntilExpiry < 2; // Rotate 2 hours before expiry
  }
}
