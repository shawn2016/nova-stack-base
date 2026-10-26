import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const REVISION = 'authz:revision';
const MUTATIONS = 'authz:mutations';
const FINISH_MUTATION = `-- nova-authz-finish
redis.call('INCR', KEYS[1])
return redis.call('DECR', KEYS[2])`;

export interface PermissionSnapshot {
  roles: string[];
  permissions: string[];
}

/** Shared revision prevents another API instance serving superseded grants. */
@Injectable()
export class PermissionCacheService {
  constructor(private readonly redisService: RedisService) {}

  async load(
    userId: string,
    loader: () => Promise<PermissionSnapshot>,
  ): Promise<PermissionSnapshot> {
    const redis = this.client();
    const [revision, pending] = await redis.mget(REVISION, MUTATIONS);
    if (Number(pending) > 0) return loader();
    const key = `authz:permissions:${revision ?? '0'}:${userId}`;
    const raw = await redis.get(key);
    const value = raw ? (JSON.parse(raw) as PermissionSnapshot) : await loader();
    const [latestRevision, latestPending] = await redis.mget(REVISION, MUTATIONS);
    if (latestRevision !== revision || Number(latestPending) > 0) return loader();
    if (!raw) await redis.set(key, JSON.stringify(value), 'EX', 60);
    return value;
  }

  async mutate<T>(mutation: () => Promise<T>): Promise<T> {
    const redis = this.client();
    await redis.incr(MUTATIONS);
    try {
      return await mutation();
    } finally {
      // If this fails, pending stays positive: reads fall back to current SQL.
      // A process crash behaves the same way, trading cache performance for safety.
      await redis.eval(FINISH_MUTATION, 2, REVISION, MUTATIONS);
    }
  }

  private client() {
    const redis = this.redisService.getClient();
    if (!redis) throw new ServiceUnavailableException('Permission service unavailable');
    return redis;
  }
}
