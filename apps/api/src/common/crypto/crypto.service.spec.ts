import { ConfigService } from '@nestjs/config';

import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let crypto: CryptoService;

  beforeEach(() => {
    const config = {
      get: () => 'a'.repeat(64), // 32-byte hex key
    } as unknown as ConfigService;
    crypto = new CryptoService(config);
  });

  it('produces deterministic hashes for equal input', () => {
    expect(crypto.hash('AMSTEL-CODE')).toBe(crypto.hash('AMSTEL-CODE'));
    expect(crypto.hash('A')).not.toBe(crypto.hash('B'));
  });

  it('round-trips encryption and decryption', () => {
    const plaintext = 'AMSTEL-7KQ9-XP2M';
    const cipher = crypto.encrypt(plaintext);
    expect(cipher).not.toContain(plaintext);
    expect(crypto.decrypt(cipher)).toBe(plaintext);
  });

  it('uses a fresh IV so identical plaintext yields different ciphertext', () => {
    expect(crypto.encrypt('same')).not.toBe(crypto.encrypt('same'));
  });

  it('fails to decrypt tampered ciphertext (GCM auth tag)', () => {
    const cipher = crypto.encrypt('secret');
    const [iv, tag, data] = cipher.split(':');
    // Flip the last hex nibble to a guaranteed-different value so the
    // ciphertext always actually changes (replacing with a fixed char is a
    // no-op 1 in 16 runs).
    const last = data.slice(-1);
    const tampered = `${iv}:${tag}:${data.slice(0, -1)}${last === '0' ? '1' : '0'}`;
    expect(() => crypto.decrypt(tampered)).toThrow();
  });
});
