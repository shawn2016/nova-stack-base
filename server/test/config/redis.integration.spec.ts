import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import Redis from 'ioredis';
import { resolve } from 'node:path';
import { RedisService } from '../../src/redis/redis.service';

const integration = process.env.TEST_REAL_REDIS === 'true' ? describe : describe.skip;
integration('real Redis namespace isolation', () => {
  it('writes through the project prefix and does not expose unprefixed keys', async () => {
    config({ path: resolve(__dirname, '../../.env') });
    const key = `config-smoke-${Date.now()}`;
    const prefix = `nova:foundation:test:${process.pid}:`;
    const settings = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 16389),
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB ?? 0),
      connectTimeout: 1000,
      commandTimeout: 1000,
    };
    const service = new RedisService(
      new ConfigService({ redis: { ...settings, keyPrefix: prefix } }),
    );
    const raw = new Redis(settings);
    try {
      await service.onModuleInit();
      const client = service.getClient();
      expect(client?.status).toBe('ready');
      await client!.set(key, 'isolated', 'EX', 30);
      expect(await raw.get(`${prefix}${key}`)).toBe('isolated');
      expect(await raw.get(key)).toBeNull();
      await client!.del(key);
    } finally {
      await service.onModuleDestroy();
      raw.disconnect();
    }
  });
});
