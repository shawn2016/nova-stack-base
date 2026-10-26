import { BadRequestException, Injectable } from '@nestjs/common';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysJobEntity, SysJobLogEntity } from '../../database/entities';
import { toApiId } from '../../common/utils/to-api-id';

@Injectable()
export class JobLogService {
  constructor(
    @InjectRepository(SysJobLogEntity)
    private readonly logRepo: Repository<SysJobLogEntity>,
  ) {}

  async list(query: { page?: number; pageSize?: number; jobId?: string }) {
    const { page = 1, pageSize = 10, jobId } = query;
    const qb = this.logRepo.createQueryBuilder('l').orderBy('l.startTime', 'DESC');

    if (jobId) {
      qb.andWhere('l.jobId = :jobId', { jobId });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async recordSuccess(
    job: SysJobEntity,
    message: string,
    startTime: Date,
  ): Promise<SysJobLogEntity> {
    const endTime = new Date();
    return this.logRepo.save(
      this.logRepo.create({
        jobId: job.id,
        jobName: job.name,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        status: 1,
        message: message.slice(0, 500),
        exceptionInfo: null,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      }),
    );
  }

  async recordFailure(
    job: SysJobEntity,
    error: unknown,
    startTime: Date,
    execution?: { executionId: string; attempt: number; retry: boolean },
  ): Promise<SysJobLogEntity> {
    const endTime = new Date();
    const exceptionInfo = error instanceof Error ? (error.stack ?? error.message) : String(error);

    return this.logRepo.save(
      this.logRepo.create({
        jobId: job.id,
        jobName: job.name,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        status: 0,
        message: execution
          ? `[${execution.executionId} attempt=${execution.attempt}] 执行失败，${execution.retry ? '等待重试' : '已终止'}`.slice(
              0,
              500,
            )
          : '执行失败',
        exceptionInfo,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      }),
    );
  }

  private toListItem(row: SysJobLogEntity) {
    return {
      id: toApiId(row.id),
      jobId: toApiId(row.jobId),
      jobName: row.jobName,
      jobGroup: row.jobGroup,
      invokeTarget: row.invokeTarget,
      status: row.status as 0 | 1,
      message: row.message,
      exceptionInfo: row.exceptionInfo,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      durationMs: row.durationMs,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export function assertValidCronExpression(expression: string): void {
  try {
    CronJob.from({ cronTime: expression, onTick: () => undefined });
  } catch {
    throw new BadRequestException('Invalid cron expression');
  }
}
