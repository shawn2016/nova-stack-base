import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { OperLogListItem, PaginationResult } from '@nova/shared-types';
import { Repository } from 'typeorm';
import { SysOperLogEntity, SysUserEntity } from '../../database/entities';
import { DataScopeService } from '../data-scope/data-scope.service';
import { ListOperLogDto } from './dto/list-oper-log.dto';

export interface WriteOperLogParams {
  userId: string;
  module: string;
  action: string;
  method: string;
  path: string;
  ip: string;
  requestSummary?: string | null;
  success: boolean;
  errorMsg?: string | null;
  durationMs: number;
}

@Injectable()
export class OperLogService {
  constructor(
    @InjectRepository(SysOperLogEntity)
    private readonly operLogRepo: Repository<SysOperLogEntity>,
    @InjectRepository(SysUserEntity)
    private readonly userRepo: Repository<SysUserEntity>,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async write(params: WriteOperLogParams): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: params.userId } });
    const username = user?.username ?? 'unknown';

    const entity = this.operLogRepo.create({
      userId: params.userId,
      username,
      module: params.module,
      action: params.action,
      method: params.method.toUpperCase(),
      path: params.path,
      ip: params.ip,
      requestSummary: params.requestSummary ?? null,
      status: params.success ? 1 : 0,
      errorMsg: params.errorMsg ?? null,
      durationMs: params.durationMs,
    });

    await this.operLogRepo.save(entity);
  }

  async list(
    query: ListOperLogDto,
    currentUserId: string,
  ): Promise<PaginationResult<OperLogListItem>> {
    const { page, pageSize, username, module, status, startTime, endTime } = query;
    const qb = this.operLogRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    const filter = await this.dataScopeService.resolveForUser(currentUserId);
    const user = await this.userRepo.findOne({ where: { id: currentUserId } });
    this.dataScopeService.applyAuditLogFilter(qb, 'log', filter, {
      userId: currentUserId,
      username: user?.username ?? '',
    });

    if (username) {
      qb.andWhere('log.username LIKE :username', { username: `%${username}%` });
    }

    if (module) {
      qb.andWhere('log.module = :module', { module });
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

  private toListItem(entity: SysOperLogEntity): OperLogListItem {
    return {
      id: String(entity.id),
      userId: String(entity.userId),
      username: entity.username,
      module: entity.module,
      action: entity.action,
      method: entity.method,
      path: entity.path,
      ip: entity.ip,
      requestSummary: entity.requestSummary,
      status: entity.status,
      errorMsg: entity.errorMsg,
      durationMs: entity.durationMs,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
