import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OTHER } from '../common/constants/defaults';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('REDIS_URL');
    this.client = url
      ? new Redis(url, {
          lazyConnect: true,
          enableAutoPipelining: true,
          retryStrategy: (times) => times > OTHER.REDIS_RETRY_MAX_ATTEMPTS ? null : Math.min(times * OTHER.REDIS_RETRY_BASE_MS, OTHER.REDIS_RETRY_MAX_MS),
        })
      : new Redis({
          host: this.configService.get('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get('REDIS_PASSWORD'),
          lazyConnect: true,
          enableAutoPipelining: true,
          retryStrategy: (times) => times > OTHER.REDIS_RETRY_MAX_ATTEMPTS ? null : Math.min(times * OTHER.REDIS_RETRY_BASE_MS, OTHER.REDIS_RETRY_MAX_MS),
        });

    this.client.on('error', () => { /* suppressed — graceful degradation */ });
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'ready') return;
    try {
      await this.client.connect();
      console.log('[Redis] Connected');
    } catch (err) {
      console.warn(`[Redis] Connection failed — ${err?.message || err}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
    }
  }

  private isConnected(): boolean {
    return this.client.status === 'ready';
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      /* silently fail — cache miss is acceptable */
    }
  }

  async setnx(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      const serialized = JSON.stringify(value);
      const result = await this.client.set(key, serialized, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      await this.client.del(key);
    } catch {
      /* silently fail */
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const stream = this.client.scanStream({ match: pattern, count: OTHER.REDIS_SCAN_COUNT });
      for await (const keys of stream) {
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      }
    } catch {
      /* silently fail */
    }
  }

  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
