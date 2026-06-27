import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin ioredis wrapper. Connections are lazy and failures are non-fatal:
 * callers should treat Redis as a best-effort cache, never a source of truth.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('redis.url', 'redis://localhost:6379');
    try {
      // lazyConnect + retry cap so a missing Redis never hard-fails the app.
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis error (degraded, caching disabled): ${err.message}`);
      });
      this.client.connect().catch((err) => {
        this.logger.warn(`Redis connect failed (degraded): ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`Redis init failed (degraded): ${(err as Error).message}`);
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  /** Returns the parsed JSON value at `key`, or null on miss / any error. */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Best-effort set with TTL (seconds). Never throws. */
  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // swallow: cache writes are best-effort
    }
  }

  /** Best-effort delete. Never throws. */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // swallow
    }
  }
}
