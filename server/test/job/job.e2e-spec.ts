jest.setTimeout(60000);

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ErrorCode } from '@nova/shared-types';
import { createE2eApp, E2eAppContext } from '../auth/e2e-app.helper';

describe('Scheduled Job API (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication<App>;
  let adminToken: string;
  let demoJobId: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    app = ctx.app;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    adminToken = loginRes.body.data.tokens.accessToken;

    const listRes = await request(app.getHttpServer())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    demoJobId = listRes.body.data.list.find((j: { name: string }) => j.name === 'Demo 心跳').id;
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /jobs 应包含 seed 示例任务', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.code).toBe(ErrorCode.SUCCESS);
    expect(res.body.data.list.some((j: { name: string }) => j.name === 'Demo 心跳')).toBe(true);
  });

  it('POST /jobs 非法 invokeTarget 应 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Bad Job',
        invokeTarget: 'unknown.handler',
        cronExpression: '0 * * * *',
      })
      .expect(400);

    expect(res.body.code).toBe(ErrorCode.BAD_REQUEST);
  });

  it('POST /jobs/:id/run 外部队列未连接时返回 503，不在 API 内执行', async () => {
    await request(app.getHttpServer())
      .post(`/api/jobs/${demoJobId}/run`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(503);
  });

  it('PUT /jobs/:id/status 暂停任务', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/jobs/${demoJobId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 0 })
      .expect(200);

    expect(res.body.data.status).toBe(0);
  });
});
