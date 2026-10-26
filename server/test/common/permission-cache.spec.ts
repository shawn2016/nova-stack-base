import { PermissionCacheService } from '../../src/common/jwt/permission-cache.service';
import { RedisService } from '../../src/redis/redis.service';
import { createMemoryRedis } from '../helpers/memory-redis';

describe('Shared permission revision', () => {
  it('invalidates grants across independent cache instances', async () => {
    const redis = createMemoryRedis();
    const provider = { getClient: () => redis } as unknown as RedisService;
    const first = new PermissionCacheService(provider);
    const second = new PermissionCacheService(provider);
    let grants = ['system:user:list'];
    const load = async () => ({ roles: ['operator'], permissions: [...grants] });
    expect((await first.load('7', load)).permissions).toEqual(grants);
    await second.mutate(async () => {
      grants = [];
    });
    expect((await first.load('7', load)).permissions).toEqual([]);
  });
  it('never caches partially written grants and invalidates after failed mutation', async () => {
    const redis = createMemoryRedis();
    const cache = new PermissionCacheService({ getClient: () => redis } as unknown as RedisService);
    let grants = ['old'];
    const load = async () => ({ roles: [], permissions: grants });
    await cache.load('1', load);
    await expect(
      cache.mutate(async () => {
        grants = ['new'];
        expect((await cache.load('1', load)).permissions).toEqual(['new']);
        throw new Error('write interrupted');
      }),
    ).rejects.toThrow('write interrupted');
    expect((await cache.load('1', load)).permissions).toEqual(['new']);
  });
  it('does not publish a stale loader result across a concurrent mutation', async () => {
    const redis = createMemoryRedis();
    const provider = { getClient: () => redis } as unknown as RedisService;
    const reader = new PermissionCacheService(provider);
    const writer = new PermissionCacheService(provider);
    let calls = 0;
    const result = await reader.load('8', async () => {
      calls++;
      if (calls === 1) {
        await writer.mutate(async () => undefined);
        return { roles: [], permissions: ['revoked'] };
      }
      return { roles: [], permissions: [] };
    });
    expect(result.permissions).toEqual([]);
  });
});
