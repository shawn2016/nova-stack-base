import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { LoginLogListItem, PaginationResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysLoginLogEntity, SysUserEntity } from '../../database/entities';
import { DataScopeService } from '../data-scope/data-scope.service';
import { ListLoginLogDto } from './dto/list-login-log.dto';

export interface RecordLoginAttemptParams {
  username: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  message?: string;
}

@Injectable()
export class LoginLogService {
  constructor(
    @InjectRepository(SysLoginLogEntity)
    private readonly loginLogRepo: Repository<SysLoginLogEntity>,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async recordLoginAttempt(params: RecordLoginAttemptParams): Promise<void> {
    const entity = this.loginLogRepo.create({
      username: params.username,
      userId: params.userId ?? null,
      ip: params.ip,
      userAgent: params.userAgent ?? null,
      status: params.success ? 1 : 0,
      message: params.message ?? (params.success ? 'success' : null),
    });
    await this.loginLogRepo.save(entity);
  }

  async list(
    query: ListLoginLogDto,
    currentUserId: string,
  ): Promise<PaginationResult<LoginLogListItem>> {
    const { page, pageSize, username, status, startTime, endTime } = query;
    const qb = this.loginLogRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    const filter = await this.dataScopeService.resolveForUser(currentUserId);
    const user = await this.userRepo.findOne({ where: { id: currentUserId } });
    this.dataScopeService.applyAuditLogFilter(qb, 'log', filter, {
      userId: currentUserId,
      username: user?.username ?? '',
    });

    if (username) {
      qb.andWhere('log.username LIKE :username', { username: `%${username}%` });
    }

    if (status !== undefined) {
      qb.andWhere('log.status = :status', { status });
    }

    if (startTime) {
      qb.andWhere('log.createdAt >= :startTime', { startTime: new Date(startTime) });
    }

    if (endTime) {
      qb.andWhere('log.createdAt <= :endTime', { endTime: new Date(endTime) });
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: items.map((item) => this.toListItem(item)),
      total,
      page,
      pageSize,
    };
  }

  private toListItem(entity: SysLoginLogEntity): LoginLogListItem {
    return {
      id: String(entity.id),
      username: entity.username,
      userId: entity.userId,
      ip: entity.ip,
      userAgent: entity.userAgent,
      status: entity.status,
      message: entity.message,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
