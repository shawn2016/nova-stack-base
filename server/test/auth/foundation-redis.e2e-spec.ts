import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { PermissionCacheService } from '../../src/common/jwt/permission-cache.service';
import { RedisService } from '../../src/redis/redis.service';
import { createE2eApp, E2eAppContext } from './e2e-app.helper';

const smoke = process.env.FOUNDATION_REDIS_SMOKE === 'true' ? describe : describe.skip;
smoke('Foundation isolated real Redis smoke', () => {
  let ctx: E2eAppContext;
  let redis: Redis;
  let cleanup: Redis;
  const prefix = `foundation-auth-smoke:${randomUUID()}:`;
  beforeAll(async () => {
    redis = new Redis({
      host: '127.0.0.1',
      port: 16389,
      keyPrefix: prefix,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
    });
    await redis.connect();
    cleanup = redis.duplicate({ keyPrefix: '', lazyConnect: true });
    await cleanup.connect();
    ctx = await createE2eApp({ redisClient: redis });
  }, 60000);
  afterAll(async () => {
    await ctx?.app.close();
    if (cleanup) {
      let cursor = '0';
      do {
        const result = await cleanup.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = result[0];
        if (result[1].length) await cleanup.del(...result[1]);
      } while (cursor !== '0');
      await cleanup.quit();
    }
    if (redis) await redis.quit();
  });
  const login = async () =>
    (
      await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200)
    ).body.data.tokens;
  it('keeps independent devices, revokes refresh on kick and filters paged metadata', async () => {
    const first = await login();
    const second = await login();
    const list = await request(ctx.app.getHttpServer())
      .get('/api/sessions/online?pageSize=1&keyword=adm')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    expect(list.body.data.total).toBe(2);
    expect(list.body.data.list).toHaveLength(1);
    const secondList = await request(ctx.app.getHttpServer())
      .get('/api/sessions/online')
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(200);
    const victim = secondList.body.data.currentTokenId;
    await request(ctx.app.getHttpServer())
      .delete(`/api/sessions/online/${victim}`)
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: second.refreshToken })
      .expect(401);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
  });
  it('invalidates permission grants across clients using a real atomic Lua script', async () => {
    const first = new PermissionCacheService({ getClient: () => redis } as unknown as RedisService);
    const other = redis.duplicate();
    try {
      const second = new PermissionCacheService({
        getClient: () => other,
      } as unknown as RedisService);
      let grants = ['system:user:list'];
      const loader = async () => ({ roles: [], permissions: grants });
      expect((await first.load('101', loader)).permissions).toHaveLength(1);
      await second.mutate(async () => {
        grants = [];
      });
      expect((await first.load('101', loader)).permissions).toEqual([]);
      expect(await redis.get('authz:mutations')).toBe('0');
    } finally {
      await other.quit();
    }
  });
});
