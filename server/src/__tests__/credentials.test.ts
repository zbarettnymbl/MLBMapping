import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential } from '../services/credentials';

describe('credentials service', () => {
  const testKey = 'a'.repeat(64); // 32-byte hex key

  it('encrypts and decrypts a credential round-trip', () => {
    const plaintext = JSON.stringify({ type: 'service_account', project_id: 'test' });
    const encrypted = encryptCredential(plaintext, testKey);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // iv:authTag:ciphertext format
    const decrypted = decryptCredential(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for the same input (random IV)', () => {
    const plaintext = 'same input';
    const a = encryptCredential(plaintext, testKey);
    const b = encryptCredential(plaintext, testKey);
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', () => {
    const plaintext = 'test';
    const encrypted = encryptCredential(plaintext, testKey);
    const tampered = encrypted.slice(0, -2) + 'xx';
    expect(() => decryptCredential(tampered, testKey)).toThrow();
  });
});
