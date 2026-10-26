import request from 'supertest';
import { JwtService } from '../../src/common/jwt/jwt.service';
import {
  AuthSessionEntity,
  SysIpBlacklistEntity,
  SysUserEntity,
} from '../../src/database/entities';
import { IpBlacklistService } from '../../src/modules/ip-blacklist/ip-blacklist.service';
import { UserService } from '../../src/modules/rbac/user/user.service';
import { createE2eApp, E2eAppContext } from './e2e-app.helper';

function gate() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}

describe('Authentication mutation races', () => {
  let ctx: E2eAppContext;
  beforeAll(async () => {
    ctx = await createE2eApp();
  }, 60000);
  afterAll(async () => {
    await ctx?.app.close();
  });

  it('rejects a login paused after stale enabled-account validation when freeze completes', async () => {
    const jwt = ctx.app.get(JwtService);
    const users = ctx.app.get(UserService);
    const account = await ctx.dataSource
      .getRepository(SysUserEntity)
      .findOneByOrFail({ username: 'admin' });
    const entered = gate();
    const resume = gate();
    const original = jwt.signRefreshToken.bind(jwt);
    const spy = jest.spyOn(jwt, 'signRefreshToken').mockImplementationOnce(async (params) => {
      entered.release();
      await resume.wait;
      return original(params);
    });
    const pending = request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .then((response) => response);
    try {
      await entered.wait;
      await users.update(String(account.id), { status: 0 });
      resume.release();
      const response = await pending;
      expect(response.status).toBe(401);
      await users.update(String(account.id), { status: 1 });
      expect(
        await ctx.dataSource
          .getRepository(AuthSessionEntity)
          .countBy({ userId: account.id, type: 'admin' }),
      ).toBe(0);
    } finally {
      resume.release();
      spy.mockRestore();
      await users.update(String(account.id), { status: 1 });
    }
  });

  it('does not publish stale allow after a delayed disable finishes after re-enable', async () => {
    const ips = ctx.app.get(IpBlacklistService);
    const account = await ctx.dataSource
      .getRepository(SysUserEntity)
      .findOneByOrFail({ username: 'admin' });
    const ip = '198.51.100.122';
    const row = await ips.createManual({ ip }, String(account.id));
    const entered = gate();
    const resume = gate();
    const increment = ctx.mockRedis.incr.getMockImplementation()!;
    let paused = false;
    const spy = jest.spyOn(ctx.mockRedis, 'incr').mockImplementation(async (key: string) => {
      if (key === `ip:blacklist:revision:${ip}` && !paused) {
        paused = true;
        entered.release();
        await resume.wait;
      }
      return increment(key);
    });
    const disable = ips.updateStatus(row.id, 0);
    try {
      await entered.wait;
      await ips.updateStatus(row.id, 1);
      resume.release();
      await disable;
      const stored = await ctx.dataSource
        .getRepository(SysIpBlacklistEntity)
        .findOneByOrFail({ ip });
      expect(stored.status).toBe(1);
      expect((await ips.isBlocked(ip)).blocked).toBe(true);
    } finally {
      resume.release();
      spy.mockRestore();
    }
  });
});
