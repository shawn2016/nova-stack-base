import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import { RuntimeSettings } from './runtime-settings';

const TAKE = `-- nova-rate-limit
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}`;

@Injectable()
export class RateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly settings: RuntimeSettings,
  ) {}
  async take(ip: string, policy: 'api' | 'login' | 'upload') {
    const client = this.redisService.getClient();
    if (!client) throw new ServiceUnavailableException('Rate limiting unavailable');
    const { values } = this.settings;
    const limit =
      policy === 'login'
        ? values.loginLimit
        : policy === 'upload'
          ? values.uploadLimit
          : values.rateLimit;
    const subject = createHash('sha256').update(ip).digest('hex');
    try {
      const result: unknown = await client.eval(
        TAKE,
        1,
        `rate:${policy}:${subject}`,
        values.rateWindowMs,
      );
      if (!Array.isArray(result) || result.length !== 2)
        throw new Error('Invalid limiter response');
      const [count, ttl] = result.map(Number);
      if (!Number.isFinite(count) || !Number.isFinite(ttl))
        throw new Error('Invalid limiter result');
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      };
    } catch {
      throw new ServiceUnavailableException('Rate limiting unavailable');
    }
  }
}
