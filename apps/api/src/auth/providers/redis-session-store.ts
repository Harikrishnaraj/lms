import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { SessionRecord, SessionStorePort } from '../ports/session-store.port';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const KEY_PREFIX = 'session:';

@Injectable()
export class RedisSessionStore implements SessionStorePort, OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async create(sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void> {
    await this.redis.set(KEY_PREFIX + sessionId, JSON.stringify(record), 'EX', ttlSeconds);
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.redis.get(KEY_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as SessionRecord) : null;
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(KEY_PREFIX + sessionId);
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }
}
