import request from 'supertest';
import { createE2eApp, E2eAppContext } from '../auth/e2e-app.helper';

describe('Runtime readiness, metrics and request boundaries', () => {
  let ctx: E2eAppContext;
  beforeAll(async () => {
    process.env.METRICS_TOKEN = 'runtime-test-metrics-secret-with-32-characters';
    ctx = await createE2eApp();
  }, 30000);
  afterAll(async () => { await ctx?.app.close(); delete process.env.METRICS_TOKEN; });

  it('separates process liveness from dependency readiness', async () => {
    await request(ctx.app.getHttpServer()).get('/api/health/live').expect(200);
    // Mock Redis is intentionally not a production readiness probe.
    await request(ctx.app.getHttpServer()).get('/api/health/ready').expect(503);
  });

  it('returns a bounded safe request ID and security headers', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/health/live').set('X-Request-ID', 'test-request-1').expect(200);
    expect(res.headers['x-request-id']).toBe('test-request-1');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const bad = await request(ctx.app.getHttpServer()).get('/api/health/live').set('X-Request-ID', 'a'.repeat(200)).expect(200);
    expect(String(bad.headers['x-request-id'])).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('protects metrics and exports aggregate labels without credentials', async () => {
    await request(ctx.app.getHttpServer()).get('/api/health/metrics').expect(401);
    const res = await request(ctx.app.getHttpServer()).get('/api/health/metrics').set('Authorization', 'Bearer runtime-test-metrics-secret-with-32-characters').expect(200);
    expect(res.text).toContain('nova_http_requests_total');
    expect(res.text).not.toContain('runtime-test-metrics-secret');
  });

  it('rejects invalid JSON without leaking the request', async () => {
    const result = await request(ctx.app.getHttpServer()).post('/api/auth/login').set('Content-Type', 'application/json').send('{secret-data').expect(400);
    expect(result.body.message).toBe('Invalid JSON body');
    expect(JSON.stringify(result.body)).not.toContain('secret-data');
  });

  it('rejects oversized JSON before controller work', async () => {
    await request(ctx.app.getHttpServer()).post('/api/auth/login').send({ username: 'a'.repeat(300000), password: 'invalid' }).expect(413);
  });
});
