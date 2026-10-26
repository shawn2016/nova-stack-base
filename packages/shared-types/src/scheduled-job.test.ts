import { describe, expect, it } from 'vitest';
import type { CreateJobDto, JobListItem, JobLogListItem, RunJobResult } from './scheduled-job.js';

describe('scheduled-job types', () => {
  it('CreateJobDto 包含 cron 与 invokeTarget', () => {
    const dto: CreateJobDto = {
      name: 'Demo 心跳',
      invokeTarget: 'demo.heartbeat',
      cronExpression: '0 */6 * * *',
      status: 0,
    };
    expect(dto.invokeTarget).toBe('demo.heartbeat');
  });

  it('JobListItem 字段完整', () => {
    const item: JobListItem = {
      id: '1',
      name: 'Demo',
      jobGroup: 'default',
      invokeTarget: 'demo.heartbeat',
      cronExpression: '0 * * * *',
      status: 1,
      concurrent: 0,
      remark: null,
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
    };
    expect(item.status).toBe(1);
  });

  it('RunJobResult 表示已排队，完成结果另查日志', () => {
    const result: RunJobResult = {
      executionId: 'execution-1',
      status: 'queued',
      message: 'ok',
    };
    expect(result.status).toBe('queued');
  });

  it('JobLogListItem 含耗时', () => {
    const log: JobLogListItem = {
      id: '1',
      jobId: '1',
      jobName: 'Demo',
      jobGroup: 'default',
      invokeTarget: 'demo.heartbeat',
      status: 1,
      message: 'ok',
      exceptionInfo: null,
      startTime: '2026-09-03T00:00:00.000Z',
      endTime: '2026-09-03T00:00:01.000Z',
      durationMs: 1000,
      createdAt: '2026-09-03T00:00:01.000Z',
    };
    expect(log.durationMs).toBe(1000);
  });
});
