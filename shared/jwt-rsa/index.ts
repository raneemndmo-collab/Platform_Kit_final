// SEC-008 FIX: JWT RSA Key Pair with Key Rotation
import { BoundedMap } from '../bounded-collections';
import * as crypto from 'crypto';

export interface JwtRsaKeyPair { kid: string; publicKey: string; privateKey: string; createdAt: Date; expiresAt: Date; }

export class JwtRsaKeyManager {
  private keys: Map<string, JwtRsaKeyPair> = new BoundedMap<unknown, unknown>(10_000);
  private activeKid: string = '';
  constructor(private readonly rotationDays: number = 30) {}

  generateKeyPair(): JwtRsaKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const kid = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.rotationDays * 86400000);
    const kp: JwtRsaKeyPair = { kid, publicKey, privateKey, createdAt: now, expiresAt };
    this.keys.set(kid, kp);
    this.activeKid = kid;
    return kp;
  }

  getActiveKey(): JwtRsaKeyPair {
    const key = this.keys.get(this.activeKid);
    if (!key || key.expiresAt < new Date()) return this.generateKeyPair();
    return key;
  }

  getKeyByKid(kid: string): JwtRsaKeyPair | undefined { return this.keys.get(kid); }

  getJwks(): { keys: Array<{ kid: string; kty: string; use: string; n: string; e: string }> } {
    const jwks: unknown[] = [];
    for (const [, kp] of this.keys) {
      const jwk = crypto.createPublicKey(kp.publicKey).export({ format: 'jwk' });
      jwks.push({ kid: kp.kid, kty: 'RSA', use: 'sig', n: (jwk as any).n, e: (jwk as any).e });
    }
    return { keys: jwks };
  }

  needsRotation(): boolean {
    const active = this.keys.get(this.activeKid);
    if (!active) return true;
    return (active.expiresAt.getTime() - Date.now()) / 86400000 < 7;
  }

  cleanupExpired(): number {
    const cutoff = new Date(Date.now() - this.rotationDays * 2 * 86400000);
    let removed = 0;
    for (const [kid, key] of this.keys) {
      if (kid !== this.activeKid && key.expiresAt < cutoff) { this.keys.delete(kid); removed++; }
    }
    return removed;
  }
}
