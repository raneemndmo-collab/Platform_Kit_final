/**
 * SEC-009: Encryption Service Tests
 * ────────────────────────────────────────────────────────
 */
import { EncryptionService } from '../shared/encryption';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env['ENCRYPTION_MASTER_KEY'] = 'test_key_32_chars_exactly_here_!';
    service = new EncryptionService();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World! مرحباً';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted.ct).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.kid).toBeDefined();
      expect(encrypted.v).toBe(1);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input', () => {
      const plaintext = 'test';
      const e1 = service.encrypt(plaintext);
      const e2 = service.encrypt(plaintext);
      expect(e1.ct).not.toBe(e2.ct); // Random IV
      expect(e1.iv).not.toBe(e2.iv);
    });

    it('should support AAD (additional authenticated data)', () => {
      const plaintext = 'sensitive data';
      const aad = 'tenant-123';
      const encrypted = service.encrypt(plaintext, aad);
      const decrypted = service.decrypt(encrypted, aad);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong AAD', () => {
      const encrypted = service.encrypt('data', 'tenant-1');
      expect(() => service.decrypt(encrypted, 'tenant-2')).toThrow();
    });
  });

  describe('field encryption', () => {
    it('should encrypt and decrypt fields', () => {
      const value = 'national-id-123456789';
      const encrypted = service.encryptField(value, 'tenant-1');
      expect(encrypted).not.toBe(value);
      const decrypted = service.decryptField(encrypted, 'tenant-1');
      expect(decrypted).toBe(value);
    });

    it('should return non-encrypted values as-is', () => {
      const plain = 'not encrypted';
      const result = service.decryptField(plain);
      expect(result).toBe(plain);
    });
  });

  describe('hashing', () => {
    it('should produce consistent hashes', () => {
      const h1 = service.hash('test@email.com');
      const h2 = service.hash('test@email.com');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different inputs', () => {
      const h1 = service.hash('input1');
      const h2 = service.hash('input2');
      expect(h1).not.toBe(h2);
    });
  });

  describe('column transformer', () => {
    it('should transform to/from encrypted', () => {
      const transformer = service.columnTransformer();
      const encrypted = transformer.to('secret');
      expect(encrypted).not.toBe('secret');
      const decrypted = transformer.from(encrypted);
      expect(decrypted).toBe('secret');
    });

    it('should handle null values', () => {
      const transformer = service.columnTransformer();
      expect(transformer.to(null)).toBeNull();
      expect(transformer.from(null)).toBeNull();
    });
  });
});
