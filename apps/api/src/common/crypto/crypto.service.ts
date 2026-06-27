import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM encryption for loyalty/QR codes and sensitive PII, plus
 * deterministic SHA-256 hashing for unique lookups (codes, tokens, OTPs).
 *
 * Ciphertext format: `iv:authTag:cipher` (all hex).
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(
      config.get<string>('security.encryptionKey', '0'.repeat(64)),
      'hex',
    );
  }

  /** Deterministic hash for unique indexes (e.g. codeHash, tokenHash). */
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
