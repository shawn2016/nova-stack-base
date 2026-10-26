import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { AuthSessionEntity, SysUserEntity, MemberUserEntity } from '../../database/entities';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload, SignTokenParams } from './jwt-payload.interface';

@Injectable()
export class JwtService {
  constructor(
    private readonly configService: ConfigService,
    private readonly nestJwtService: NestJwtService,
    private readonly redisService: RedisService,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepo: Repository<AuthSessionEntity>,
  ) {}

  async signAccessToken(params: SignTokenParams): Promise<string> {
    const sid = params.sessionId ?? randomUUID();
    return this.nestJwtService.signAsync(
      {
        sub: String(params.userId),
        type: params.type,
        purpose: 'access',
        sid,
        jti: sid,
        nonce: randomUUID(),
      },
      { expiresIn: this.accessTtlSeconds() },
    );
  }

  async signRefreshToken(params: SignTokenParams): Promise<string> {
    const sid = params.sessionId ?? randomUUID();
    const ttl = this.refreshTtlSeconds();
    const token = await this.nestJwtService.signAsync(
      { sub: String(params.userId), type: params.type, purpose: 'refresh', sid, jti: randomUUID() },
      { expiresIn: ttl },
    );
    const claims = this.nestJwtService.decode(token) as JwtPayload;
    // Serialize issuance with status updates/deletion on the account row. The
    // status check and insert must use the same transaction/connection.
    await this.sessionRepo.manager.transaction(async (manager) => {
      const accountEntity = params.type === 'admin' ? SysUserEntity : MemberUserEntity;
      const query = manager
        .getRepository(accountEntity)
        .createQueryBuilder('account')
        .select(['account.id', 'account.status'])
        .where('account.id = :id', { id: params.userId });
      if (
        manager.connection.options.type === 'mysql' ||
        manager.connection.options.type === 'mariadb'
      ) {
        query.setLock('pessimistic_write');
      }
      const account = await query.getOne();
      if (!account || account.status !== 1)
        throw new UnauthorizedException('Account disabled; please log in again');
      await manager.insert(AuthSessionEntity, {
        id: sid,
        userId: params.userId,
        type: params.type,
        username: '',
        ip: '',
        userAgent: null,
        loginAt: new Date(),
        expiresAt: new Date(claims.exp * 1000),
      });
    });
    // The session record is the authority for BOTH token purposes. DEL revokes
    // access and refresh together; refresh never creates this record again.
    await this.requireRedisClient().set(this.sessionKey(sid), token, 'EX', ttl);
    await this.cleanupExpiredSessions();
    return token;
  }

  async verifyToken(token: string, purpose?: JwtPayload['purpose']): Promise<JwtPayload> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token);
      this.assertClaims(payload, purpose);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or legacy token; please log in again');
    }
  }

  assertClaims(payload: JwtPayload, purpose?: JwtPayload['purpose']): void {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      !['admin', 'member'].includes(payload.type) ||
      !['access', 'refresh'].includes(payload.purpose) ||
      typeof payload.sid !== 'string' ||
      !payload.sid ||
      typeof payload.jti !== 'string' ||
      !payload.jti ||
      !Number.isFinite(payload.exp) ||
      (purpose && payload.purpose !== purpose) ||
      (payload.purpose === 'access' && payload.jti !== payload.sid)
    ) {
      throw new UnauthorizedException('Invalid or legacy token; please log in again');
    }
  }

  async assertSessionActive(payload: JwtPayload, refreshToken?: string): Promise<void> {
    this.assertClaims(payload, refreshToken ? 'refresh' : 'access');
    const accountEntity = payload.type === 'admin' ? SysUserEntity : MemberUserEntity;
    const active = await this.sessionRepo
      .createQueryBuilder('s')
      .innerJoin(accountEntity, 'u', 'u.id = s.user_id AND u.status = 1')
      .where('s.id = :sid AND s.type = :type AND s.user_id = :userId AND s.expires_at > :now', {
        sid: payload.sid,
        type: payload.type,
        userId: payload.sub,
        now: new Date(),
      })
      .getExists();
    if (!active) {
      await this.revokeSession(payload.sid);
      throw new UnauthorizedException('Session expired or account disabled; please log in again');
    }
    const stored = await this.requireRedisClient().get(this.sessionKey(payload.sid));
    if (!stored || (refreshToken && stored !== refreshToken)) {
      throw new UnauthorizedException('Session revoked; please log in again');
    }
    const session = await this.verifyToken(stored, 'refresh');
    if (
      session.sub !== payload.sub ||
      session.type !== payload.type ||
      session.sid !== payload.sid
    ) {
      throw new UnauthorizedException('Invalid session');
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    // Remove SQL authority first: failures between stores cannot resurrect a session.
    await this.sessionRepo.delete({ id: sessionId });
    await this.requireRedisClient().del(this.sessionKey(sessionId));
  }

  async revokeAccountSessions(type: 'admin' | 'member', userId: string): Promise<void> {
    // Redis entries expire naturally; absence of SQL authority immediately denies all devices.
    await this.sessionRepo.delete({ type, userId });
  }

  extractJti(token: string): string {
    const payload = this.nestJwtService.decode(token) as JwtPayload | null;
    if (!payload) throw new UnauthorizedException('Invalid token');
    this.assertClaims(payload);
    return payload.jti;
  }

  async blacklist(jti: string, ttl: number): Promise<void> {
    await this.requireRedisClient().set(`jwt:blacklist:${jti}`, '1', 'EX', Math.max(1, ttl));
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return (await this.requireRedisClient().exists(`jwt:blacklist:${jti}`)) === 1;
  }

  accessTtlSeconds(): number {
    return durationSeconds(this.configService.get<string>('jwt.accessExpiresIn') ?? '2h');
  }

  refreshTtlSeconds(): number {
    return durationSeconds(this.configService.get<string>('jwt.expiresIn') ?? '7d');
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const rows = await this.sessionRepo.find({
      where: { expiresAt: LessThanOrEqual(new Date()) },
      select: ['id'],
      order: { expiresAt: 'ASC' },
      take: 100,
    });
    if (rows.length)
      await this.sessionRepo.delete({
        id: In(rows.map((row) => row.id)),
        expiresAt: LessThanOrEqual(new Date()),
      });
  }

  private sessionKey(sid: string): string {
    return `auth:session:${sid}`;
  }

  private requireRedisClient() {
    const client = this.redisService.getClient();
    if (!client) throw new UnauthorizedException('Auth service unavailable');
    return client;
  }
}

export function durationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) throw new Error('Invalid JWT duration');
  const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 0);
  if (!Number.isSafeInteger(seconds) || seconds < 1) throw new Error('Invalid JWT duration');
  return seconds;
}
