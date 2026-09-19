import { it, expect } from 'vitest';
import { seal, unseal } from '../../src/utils/encryption.js';
import { hashCode, equalHash, durationMs } from '../../src/utils/crypto.js';
it('encrypts auth outbox bodies with authenticated encryption', () => {
  const encrypted = seal('123456');
  expect(encrypted).not.toContain('123456');
  expect(unseal(encrypted)).toBe('123456');
  expect(() => unseal(encrypted.slice(0, -4) + 'AAAA')).toThrow();
});
it('compares hashes without accepting truncated input', () => {
  expect(equalHash(hashCode('123456'), hashCode('123456'))).toBe(true);
  expect(equalHash(hashCode('123456'), '123')).toBe(false);
  expect(durationMs('30d')).toBe(2592000000);
});
