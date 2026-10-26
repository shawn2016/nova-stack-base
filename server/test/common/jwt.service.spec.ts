import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { JwtService } from '../../src/common/jwt/jwt.service';
import { AuthSessionEntity } from '../../src/database/entities';
import { RedisService } from '../../src/redis/redis.service';
import { createMemoryRedis } from '../helpers/memory-redis';

describe('JwtService session-bound credentials', () => {
  let service: JwtService;
  let redis: ReturnType<typeof createMemoryRedis>;
  let nest: NestJwtService;
  beforeEach(() => {
    redis = createMemoryRedis();
    nest = new NestJwtService({ secret: 'test-secret-key-at-least-32-chars-long' });
    const config = {
      get: (key: string) => ({ 'jwt.accessExpiresIn': '2h', 'jwt.expiresIn': '3m' })[key],
    } as ConfigService;
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getExists: async () => true,
    };
    const repo = {
      manager: {
        transaction: async (work: (manager: unknown) => Promise<void>) =>
          work({
            connection: { options: { type: 'better-sqlite3' } },
            getRepository: () => ({
              createQueryBuilder: () => ({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: async () => ({ id: '1', status: 1 }),
              }),
            }),
            insert: jest.fn(),
          }),
      },
      insert: jest.fn(),
      find: async () => [],
      delete: jest.fn(),
      createQueryBuilder: () => query,
    } as unknown as Repository<AuthSessionEntity>;
    service = new JwtService(
      config,
      nest,
      { getClient: () => redis } as unknown as RedisService,
      repo,
    );
  });
  it('marks token purpose and binds the pair to a session', async () => {
    const refresh = await service.signRefreshToken({
      userId: '42',
      type: 'admin',
      sessionId: 'device-a',
    });
    const access = await service.signAccessToken({
      userId: '42',
      type: 'admin',
      sessionId: 'device-a',
    });
    expect(await service.verifyToken(access, 'access')).toMatchObject({
      sid: 'device-a',
      purpose: 'access',
      jti: 'device-a',
    });
    expect(await service.verifyToken(refresh, 'refresh')).toMatchObject({
      sid: 'device-a',
      purpose: 'refresh',
    });
    await expect(service.verifyToken(access, 'refresh')).rejects.toThrow('please log in again');
    await expect(service.verifyToken(refresh, 'access')).rejects.toThrow('please log in again');
  });
  it('uses configured refresh expiry in Redis and the JWT', async () => {
    const token = await service.signRefreshToken({
      userId: '1',
      type: 'member',
      sessionId: 'device-b',
    });
    const payload = await service.verifyToken(token);
    expect(payload.exp - payload.iat).toBe(180);
    expect(await redis.ttl('auth:session:device-b')).toBe(180);
    expect(await redis.get('auth:session:device-b')).toBe(token);
  });
  it('revokes both purposes without revoking another device', async () => {
    const first = await service.signRefreshToken({
      userId: '1',
      type: 'admin',
      sessionId: 'first',
    });
    const second = await service.signRefreshToken({
      userId: '1',
      type: 'admin',
      sessionId: 'second',
    });
    await service.revokeSession('first');
    await expect(
      service.assertSessionActive(await service.verifyToken(first), first),
    ).rejects.toThrow('Session revoked');
    await expect(
      service.assertSessionActive(await service.verifyToken(second), second),
    ).resolves.toBeUndefined();
  });
  it('requires explicit re-login for old signed tokens', async () => {
    const legacy = nest.sign({ sub: '42', type: 'admin', jti: 'old' }, { expiresIn: '2h' });
    await expect(service.verifyToken(legacy)).rejects.toThrow('please log in again');
  });
  it('fails closed when Redis is missing even in test mode', async () => {
    const missing = new JwtService(
      {} as ConfigService,
      nest,
      { getClient: () => null } as unknown as RedisService,
      {} as Repository<AuthSessionEntity>,
    );
    await expect(missing.isBlacklisted('unknown')).rejects.toThrow('Auth service unavailable');
  });
});
