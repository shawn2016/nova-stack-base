import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { createDatabaseOptions } from '../../src/database/data-source-options';
import { runInitSeed } from '../../src/database/seeds/init.seed';
import { configureApp } from '../../src/bootstrap';
import { RedisService } from '../../src/redis/redis.service';
import { RuntimeSettings } from '../../src/runtime/runtime-settings';

const integration = process.env.FOUNDATION_MYSQL_SMOKE === 'true' ? describe : describe.skip;
integration('two API instances with real isolated MySQL and Redis', () => {
  const apps: INestApplication[] = [];
  let source: DataSource;
  const prefix = `foundation-runtime-${randomUUID()}:`;
  let tokens: { accessToken: string; refreshToken: string };
  beforeAll(async () => {
    config({ path: resolve(__dirname, '../../.env') });
    const database = process.env.TEST_RUNTIME_DATABASE ?? 'nova_foundation_runtime_test';
    if (!database.startsWith('nova_foundation_runtime_test')) throw new Error('Disposable runtime test database required');
    Object.assign(process.env, { NODE_ENV: 'test', CORS_ORIGINS: 'http://localhost:5173', DB_DATABASE: database, DB_SYNCHRONIZE: 'false', SKIP_EXTERNAL_SERVICES: 'false', APP_ROLE: 'api', REDIS_KEY_PREFIX: prefix, RATE_LIMIT_ENABLED: 'true', RATE_LIMIT_MAX: '1000', LOGIN_RATE_LIMIT_MAX: '100', RATE_LIMIT_WINDOW_MS: '60000', METRICS_TOKEN: 'runtime-integration-metrics-key-over-32-characters', TRUST_PROXY: 'false' });
    source = new DataSource(createDatabaseOptions());
    await source.initialize();
    await source.dropDatabase();
    await source.runMigrations({ transaction: 'none' });
    await runInitSeed(source);
    const { AppModule } = await import('../../src/app.module');
    for (let i = 0; i < 2; i++) {
      const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
      await configureApp(app);
      await app.listen(0, '127.0.0.1');
      apps.push(app);
    }
  }, 60000);
  afterAll(async () => {
    const client = apps[0]?.get(RedisService).getClient();
    if (client?.status === 'ready') {
      const raw = client.duplicate({ keyPrefix: '', lazyConnect: true });
      await raw.connect();
      let cursor = '0';
      do {
        const [next, keys] = await raw.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) await raw.del(...keys);
      } while (cursor !== '0');
      await raw.quit();
    }
    for (const app of apps.reverse()) await app.close();
    if (source?.isInitialized) await source.destroy();
  }, 30000);
  const login = async (index: number) => (await request(apps[index].getHttpServer()).post('/api/auth/login').send({ username: 'admin', password: 'admin123' }).expect(200)).body.data.tokens;

  it('migrated schema is ready, and distinct clients can refresh and revoke across instances', async () => {
    await request(apps[0].getHttpServer()).get('/api/health/ready').expect(200);
    const first = await login(0);
    tokens = await login(1);
    await request(apps[1].getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${first.accessToken}`).expect(200);
    await request(apps[0].getHttpServer()).post('/api/auth/logout').set('Authorization', `Bearer ${first.accessToken}`).expect(200);
    await request(apps[1].getHttpServer()).post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
    await request(apps[0].getHttpServer()).post('/api/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(200);
  });

  it('records a bounded authenticated read smoke with measured latency', async () => {
    const durations: number[] = [];
    const started = performance.now();
    await Promise.all(Array.from({ length: 10 }, async (_, worker) => {
      for (let n = 0; n < 10; n++) {
        const start = performance.now();
        await request(apps[worker % 2].getHttpServer()).get('/api/users?page=1&pageSize=20').set('Authorization', `Bearer ${tokens.accessToken}`).expect(200);
        durations.push(performance.now() - start);
      }
    }));
    durations.sort((a,b) => a-b);
    console.log(JSON.stringify({ scenario: 'local-authenticated-user-list', instances: 2, requests: 100, clients: 10, elapsedMs: Math.round(performance.now()-started), p95Ms: Math.round(durations[94]), p99Ms: Math.round(durations[98]), errors: 0, dataset: 'seed fixtures; not a capacity guarantee' }));
  });

  it('shares the rate budget between API instances and returns CORS on 429', async () => {
    for (const app of apps) app.get(RuntimeSettings).values.rateLimit = 3;
    const client = apps[0].get(RedisService).getClient()!;
    const ip = createHash('sha256').update('127.0.0.1').digest('hex');
    await client.del(`rate:api:${ip}`);
    for (let i=0; i<3; i++) await request(apps[i%2].getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${tokens.accessToken}`).expect(200);
    const res = await request(apps[1].getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${tokens.accessToken}`).set('Origin', 'http://localhost:5173').expect(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const metric = await request(apps[1].getHttpServer()).get('/api/health/metrics').set('Authorization', 'Bearer runtime-integration-metrics-key-over-32-characters').expect(200);
    expect(metric.text).toContain('nova_rate_limit_rejected_total{policy="api"} 1');
  });

  it('becomes unready when its real Redis connection disappears', async () => {
    apps[1].get(RedisService).getClient()!.disconnect();
    await request(apps[1].getHttpServer()).get('/api/health/ready').expect(503);
  });
});
