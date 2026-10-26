import request from 'supertest';
import { createE2eApp, E2eAppContext } from './e2e-app.helper';
import { IpBlacklistService } from '../../src/modules/ip-blacklist/ip-blacklist.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberUserEntity, SysIpBlacklistEntity, SysUserEntity } from '../../src/database/entities';

describe('Session security foundation', () => {
  let ctx: E2eAppContext;
  beforeAll(async () => {
    ctx = await createE2eApp();
  }, 60000);
  afterAll(async () => {
    await ctx?.app.close();
  });
  const login = async () =>
    (
      await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect((res) => {
          if (res.status !== 200) throw new Error(String(res.body.message));
        })
        .expect(200)
    ).body.data.tokens;
  it('refresh token cannot authorize a protected access route', async () => {
    const tokens = await login();
    await request(ctx.app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokens.refreshToken}`)
      .expect(401);
  });
  it('access token cannot be exchanged as refresh', async () => {
    const tokens = await login();
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: tokens.accessToken })
      .expect(401);
  });
  it('logout revokes refresh for only its own device', async () => {
    const first = await login();
    const second = await login();
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
    await request(ctx.app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: second.refreshToken })
      .expect(200);
  });
  it('frozen account cannot refresh or access protected routes', async () => {
    const tokens = await login();
    const repo = ctx.dataSource.getRepository(SysUserEntity);
    const user = await repo.findOneByOrFail({ username: 'admin' });
    await repo.update(user.id, { status: 0 });
    try {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
      await request(ctx.app.getHttpServer())
        .get('/api/auth/me/menus')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);
    } finally {
      await repo.update(user.id, { status: 1 });
    }
  });
  it('listing sessions never uses KEYS and uses indexed page reads', async () => {
    const tokens = await login();
    ctx.mockRedis.keys.mockClear();
    const response = await request(ctx.app.getHttpServer())
      .get('/api/sessions/online?pageSize=1&keyword=adm')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(response.body.data.list).toHaveLength(1);
    expect(ctx.mockRedis.keys).not.toHaveBeenCalled();
  });
  it('normal IP misses are negatively cached', async () => {
    const repository = ctx.app.get<Repository<SysIpBlacklistEntity>>(
      getRepositoryToken(SysIpBlacklistEntity),
    );
    const spy = jest.spyOn(repository, 'findOne');
    try {
      for (let n = 0; n < 3; n++) await ctx.app.get(IpBlacklistService).isBlocked('198.51.100.91');
      expect(
        spy.mock.calls.filter(([query]) => JSON.stringify(query).includes('198.51.100.91')).length,
      ).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
  it('invalidates granted permissions for role status, grants and user assignments', async () => {
    const admin = await login();
    const api = ctx.app.getHttpServer();
    const header = `Bearer ${admin.accessToken}`;
    const role = (
      await request(api)
        .post('/api/roles')
        .set('Authorization', header)
        .send({ name: 'Foundation operator', code: 'foundation_operator' })
        .expect(201)
    ).body.data;
    const user = (
      await request(api)
        .post('/api/users')
        .set('Authorization', header)
        .send({ username: 'foundation_operator', password: 'operator123' })
        .expect(201)
    ).body.data;
    const assign = () =>
      request(api)
        .put(`/api/roles/${role.id}/permissions`)
        .set('Authorization', header)
        .send({ permissionCodes: ['system:user:list'] })
        .expect(200);
    await assign();
    await request(api)
      .put(`/api/users/${user.id}/roles`)
      .set('Authorization', header)
      .send({ roleIds: [role.id] })
      .expect(200);
    const operator = (
      await request(api)
        .post('/api/auth/login')
        .send({ username: 'foundation_operator', password: 'operator123' })
        .expect(200)
    ).body.data.tokens;
    const read = (status: number) =>
      request(api)
        .get('/api/users')
        .set('Authorization', `Bearer ${operator.accessToken}`)
        .expect(status);
    await read(200);
    await request(api)
      .put(`/api/roles/${role.id}`)
      .set('Authorization', header)
      .send({ status: 0 })
      .expect(200);
    await read(403);
    await request(api)
      .put(`/api/roles/${role.id}`)
      .set('Authorization', header)
      .send({ status: 1 })
      .expect(200);
    await read(200);
    await request(api)
      .put(`/api/roles/${role.id}/permissions`)
      .set('Authorization', header)
      .send({ permissionCodes: [] })
      .expect(200);
    await read(403);
    await assign();
    await read(200);
    await request(api)
      .put(`/api/users/${user.id}/roles`)
      .set('Authorization', header)
      .send({ roleIds: [] })
      .expect(200);
    await read(403);
    await request(api)
      .put(`/api/users/${user.id}`)
      .set('Authorization', header)
      .send({ status: 0 })
      .expect(200);
    await request(api)
      .put(`/api/users/${user.id}`)
      .set('Authorization', header)
      .send({ status: 1 })
      .expect(200);
    await request(api)
      .post('/api/auth/refresh')
      .send({ refreshToken: operator.refreshToken })
      .expect(401);
  });
  it('invalidates normal-IP negative cache after block and unblock', async () => {
    const service = ctx.app.get(IpBlacklistService);
    expect(await service.isBlocked('198.51.100.92')).toEqual({ blocked: false });
    const admin = await ctx.dataSource
      .getRepository(SysUserEntity)
      .findOneByOrFail({ username: 'admin' });
    const row = await service.createManual({ ip: '198.51.100.92' }, String(admin.id));
    expect((await service.isBlocked('198.51.100.92')).blocked).toBe(true);
    await service.updateStatus(row.id, 0);
    expect((await service.isBlocked('198.51.100.92')).blocked).toBe(false);
  });
  it('member sessions are independent and disabled members cannot refresh', async () => {
    const api = ctx.app.getHttpServer();
    const memberLogin = async () =>
      (
        await request(api)
          .post('/api/member/auth/login')
          .send({ phone: '13800138000', password: 'member123' })
          .expect(200)
      ).body.data.tokens;
    const first = await memberLogin();
    const second = await memberLogin();
    await request(api)
      .post('/api/member/auth/logout')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    await request(api)
      .post('/api/member/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    await request(api)
      .post('/api/member/auth/refresh')
      .send({ refreshToken: second.refreshToken })
      .expect(200);
    const repo = ctx.dataSource.getRepository(MemberUserEntity);
    const member = await repo.findOneByOrFail({ phone: '13800138000' });
    await repo.update(member.id, { status: 0 });
    try {
      await request(api)
        .post('/api/member/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(401);
    } finally {
      await repo.update(member.id, { status: 1 });
    }
  });
});
