import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DataScopeFilter,
  KickOnlineSessionResult,
  OnlineSessionListResult,
} from '@nova/shared-types';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { JwtService } from '../../common/jwt/jwt.service';
import { AuthSessionEntity, SysConfigEntity, SysUserEntity } from '../../database/entities';
import { DataScopeService } from '../data-scope/data-scope.service';
import { ListOnlineSessionsDto } from './dto/list-online-sessions.dto';

export const MODULE_ENABLED_KEY = 'online_session.module.enabled';
interface OnlineSessionRecord {
  userId: string;
  username: string;
  ip: string;
  userAgent: string | null;
  loginAt: string;
}

@Injectable()
export class OnlineSessionService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(SysConfigEntity) private readonly configRepo: Repository<SysConfigEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepo: Repository<AuthSessionEntity>,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async register(tokenId: string, record: OnlineSessionRecord, _ttlSeconds: number): Promise<void> {
    // Auth always creates the authoritative row, even when the optional UI is disabled.
    await this.sessionRepo.update(
      { id: tokenId, type: 'admin' },
      {
        username: record.username,
        ip: record.ip,
        userAgent: record.userAgent,
      },
    );
  }

  async remove(tokenId: string): Promise<void> {
    await this.sessionRepo.delete({ id: tokenId });
  }

  async list(
    query: ListOnlineSessionsDto,
    currentTokenId: string,
    currentUserId: string,
  ): Promise<OnlineSessionListResult> {
    const { page = 1, pageSize = 10, keyword } = query;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      (keyword?.length ?? 0) > 64
    ) {
      throw new BadRequestException('Invalid session pagination or keyword');
    }
    const empty = { list: [], total: 0, page, pageSize, currentTokenId };
    if (!(await this.isModuleEnabled())) return empty;
    const qb = this.activeQuery();
    this.applyScope(qb, await this.dataScopeService.resolveForUser(currentUserId));
    if (keyword?.trim()) {
      const escaped = keyword.trim().toLowerCase().replace(/[!%_]/g, '!$&');
      qb.andWhere("(LOWER(s.username) LIKE :kw ESCAPE '!' OR LOWER(s.ip) LIKE :kw ESCAPE '!')", {
        kw: `%${escaped}%`,
      });
    }
    const [rows, total] = await qb
      .orderBy('s.loginAt', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .maxExecutionTime(1500)
      .getManyAndCount();
    return {
      list: rows.map((row) => ({
        tokenId: row.id,
        userId: String(row.userId),
        username: row.username,
        ip: row.ip,
        userAgent: row.userAgent,
        loginAt: row.loginAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      currentTokenId,
    };
  }

  async kick(
    tokenId: string,
    operatorTokenId: string,
    _accessTokenTtlSeconds: number,
    operatorUserId?: string,
  ): Promise<KickOnlineSessionResult> {
    if (tokenId === operatorTokenId) throw new BadRequestException('Cannot kick current session');
    const qb = this.activeQuery().andWhere('s.id = :tokenId', { tokenId });
    if (operatorUserId)
      this.applyScope(qb, await this.dataScopeService.resolveForUser(operatorUserId));
    if (!(await qb.getExists())) throw new NotFoundException('Session not found');
    await this.jwtService.revokeSession(tokenId);
    return { success: true };
  }

  private activeQuery(): SelectQueryBuilder<AuthSessionEntity> {
    return this.sessionRepo
      .createQueryBuilder('s')
      .innerJoin(SysUserEntity, 'u', 'u.id = s.user_id AND u.status = 1')
      .where("s.type = :type AND s.expires_at > :now AND s.username <> ''", {
        type: 'admin',
        now: new Date(),
      });
  }

  private applyScope(qb: SelectQueryBuilder<AuthSessionEntity>, filter: DataScopeFilter): void {
    if (filter.type === 'all') return;
    if (filter.type === 'none') {
      qb.andWhere('1 = 0');
      return;
    }
    if (filter.type === 'self') {
      qb.andWhere('s.user_id = :scopeUserId', { scopeUserId: filter.userId });
      return;
    }
    if (!filter.deptIds.length) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere('u.dept_id IN (:...scopeDeptIds)', { scopeDeptIds: filter.deptIds });
  }

  private async isModuleEnabled(): Promise<boolean> {
    const config = await this.configRepo.findOne({ where: { configKey: MODULE_ENABLED_KEY } });
    return config?.configValue !== 'false';
  }
}
export type { OnlineSessionRecord };
