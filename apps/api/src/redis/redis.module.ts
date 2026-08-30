import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
        client.on('error', (err) => {
          logger.warn(`Redis connection error (${url}): ${err.message}`);
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
