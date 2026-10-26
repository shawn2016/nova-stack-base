import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import Redis from 'ioredis';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { JwtService } from '../../src/common/jwt/jwt.service';
import { createDatabaseOptions } from '../../src/database/data-source-options';
import {
  AuthSessionEntity,
  SysIpBlacklistEntity,
  SysUserEntity,
} from '../../src/database/entities';
import { IpBlacklistService } from '../../src/modules/ip-blacklist/ip-blacklist.service';
import { RedisService } from '../../src/redis/redis.service';

const smoke = process.env.FOUNDATION_MYSQL_AUTH_SMOKE === 'true' ? describe : describe.skip;
function gate() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}

smoke('Session issuance real MySQL row-lock races', () => {
  let source: DataSource;
  let redis: Redis;
  let rawRedis: Redis;
  let jwt: JwtService;
  let userId: string;
  const database = process.env.TEST_MYSQL_AUTH_DATABASE ?? 'nova_foundation_auth_race_test';
  const prefix = `${database}:`;
  beforeAll(async () => {
    const envPath = resolve(__dirname, '../../.env');
    const local = { ...(existsSync(envPath) ? parse(readFileSync(envPath)) : {}), ...process.env };
    if (!/^nova_foundation_auth_race_test(?:_[a-z0-9]+)?$/.test(database))
      throw new Error('Refusing non-disposable auth race database');
    source = new DataSource(
      createDatabaseOptions({
        ...local,
        DB_USERNAME: process.env.TEST_MYSQL_AUTH_USERNAME ?? local.DB_USERNAME,
        DB_PASSWORD: process.env.TEST_MYSQL_AUTH_PASSWORD ?? local.DB_PASSWORD,
        NODE_ENV: 'test',
        SKIP_EXTERNAL_SERVICES: 'false',
        DB_SYNCHRONIZE: 'false',
        DB_DATABASE: database,
      }),
    );
    await source.initialize();
    await source.dropDatabase();
    await source.runMigrations({ transaction: 'none' });
    redis = new Redis({
      host: local.REDIS_HOST ?? '127.0.0.1',
      port: Number(local.REDIS_PORT ?? 16389),
      username: local.REDIS_USERNAME || undefined,
      password: local.REDIS_PASSWORD || undefined,
      keyPrefix: prefix,
    });
    await redis.ping();
    rawRedis = redis.duplicate({ keyPrefix: '' });
    const secret = 'isolated-mysql-auth-smoke-secret-32-chars';
    jwt = new JwtService(
      new ConfigService({ jwt: { accessExpiresIn: '2h', expiresIn: '3m' } }),
      new NestJwtService({ secret }),
      { getClient: () => redis } as unknown as RedisService,
      source.getRepository(AuthSessionEntity),
    );
    const user = await source.getRepository(SysUserEntity).save({
      username: 'isolated_auth_race',
      nickname: 'race',
      passwordHash: 'not-used-for-direct-issuer-test',
      status: 1,
      avatar: null,
      deptId: null,
    });
    userId = String(user.id);
  }, 60000);
  afterAll(async () => {
    if (source?.isInitialized) {
      try {
        await source.dropDatabase();
      } finally {
        await source.destroy();
      }
    }
    if (rawRedis) {
      let cursor = '0';
      do {
        const result = await rawRedis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = result[0];
        if (result[1].length) await rawRedis.del(...result[1]);
      } while (cursor !== '0');
      await rawRedis.quit();
    }
    if (redis) await redis.quit();
  });

  it('rechecks frozen account status before inserting a session', async () => {
    await source.getRepository(SysUserEntity).update(userId, { status: 0 });
    await jwt.revokeAccountSessions('admin', userId);
    await expect(jwt.signRefreshToken({ userId, type: 'admin' })).rejects.toThrow(
      'Account disabled',
    );
    expect(await source.getRepository(AuthSessionEntity).count()).toBe(0);
    await source.getRepository(SysUserEntity).update(userId, { status: 1 });
  });

  it('holds the account lock through insert so a concurrent freeze revokes the new session', async () => {
    const entered = gate();
    const resume = gate();
    const original = source.createQueryRunner.bind(source);
    let paused = false;
    let lockingSelect = false;
    const spy = jest.spyOn(source, 'createQueryRunner').mockImplementation((mode) => {
      const runner = original(mode);
      const query = runner.query.bind(runner);
      jest.spyOn(runner, 'query').mockImplementation(async (sql, parameters, structured) => {
        if (sql.includes('FROM `sys_user`') && sql.includes('FOR UPDATE')) lockingSelect = true;
        if (!paused && sql.startsWith('INSERT INTO `auth_session`')) {
          paused = true;
          entered.release();
          await resume.wait;
        }
        return query(sql, parameters, structured);
      });
      return runner;
    });
    const issuance = jwt.signRefreshToken({ userId, type: 'admin', sessionId: randomUUID() });
    const freezer = source.createQueryRunner();
    try {
      await entered.wait;
      expect(lockingSelect).toBe(true);
      await freezer.connect();
      await freezer.query('SET SESSION innodb_lock_wait_timeout = 1');
      // An actual InnoDB timeout proves this competing SQL update cannot pass
      // the row lock while issuance is paused immediately before its INSERT.
      await expect(
        freezer.query('UPDATE sys_user SET status = 0 WHERE id = ?', [userId]),
      ).rejects.toMatchObject({ code: 'ER_LOCK_WAIT_TIMEOUT' });
      resume.release();
      const token = await issuance;
      await freezer.query('UPDATE sys_user SET status = 0 WHERE id = ?', [userId]);
      await jwt.revokeAccountSessions('admin', userId);
      await source.getRepository(SysUserEntity).update(userId, { status: 1 });
      expect(await source.getRepository(AuthSessionEntity).count()).toBe(0);
      await expect(jwt.assertSessionActive(await jwt.verifyToken(token), token)).rejects.toThrow(
        'Session expired',
      );
    } finally {
      resume.release();
      await issuance.catch(() => undefined);
      await freezer.release();
      spy.mockRestore();
    }
  }, 15000);
  it('keeps the final SQL ban after concurrent status writers complete out of order', async () => {
    const ips = new IpBlacklistService(
      source.getRepository(SysIpBlacklistEntity),
      { getClient: () => redis } as unknown as RedisService,
      new ConfigService({ ipBlacklist: { whitelist: [] } }),
    );
    const ip = '198.51.100.123';
    const row = await ips.createManual({ ip }, userId);
    const entered = gate();
    const resume = gate();
    const increment = redis.incr.bind(redis);
    let paused = false;
    const spy = jest.spyOn(redis, 'incr').mockImplementation(async (key) => {
      if (String(key) === `ip:blacklist:revision:${ip}` && !paused) {
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
      expect(
        (await source.getRepository(SysIpBlacklistEntity).findOneByOrFail({ ip })).status,
      ).toBe(1);
      const other = redis.duplicate();
      try {
        const reader = new IpBlacklistService(
          source.getRepository(SysIpBlacklistEntity),
          { getClient: () => other } as unknown as RedisService,
          new ConfigService({ ipBlacklist: { whitelist: [] } }),
        );
        expect((await reader.isBlocked(ip)).blocked).toBe(true);
        expect((await reader.isBlocked(ip)).blocked).toBe(true);
      } finally {
        await other.quit();
      }
    } finally {
      resume.release();
      await disable.catch(() => undefined);
      spy.mockRestore();
    }
  });
});
