import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SysJobEntity, SysJobLogEntity } from '../../src/database/entities';
import { JobHandlerRegistry } from '../../src/modules/job/job-handler.registry';
import { JobLogService } from '../../src/modules/job/job-log.service';
import { JobSchedulerService } from '../../src/modules/job/job-scheduler.service';

// The original scheduler executes the handler inside the HTTP request. An API
// instance must instead fail closed when the persistent queue is unavailable.
describe('Job API queue boundary', () => {
  it('does not execute handlers or claim completion without a queue', async () => {
    const job = Object.assign(new SysJobEntity(), {
      id: '1',
      name: 'heartbeat',
      invokeTarget: 'demo.heartbeat',
      status: 0,
      concurrent: 0,
      jobGroup: 'default',
      cronExpression: '* * * * *',
    });
    let executed = false;
    const registry = new JobHandlerRegistry();
    registry.register(
      'demo.heartbeat',
      async () => {
        executed = true;
        return 'completed';
      },
      'test',
    );
    const repo = { findOne: async () => job } as unknown as Repository<SysJobEntity>;
    const logs = new JobLogService({
      create: (value: object) => value,
      save: async (value: object) => ({ ...value, id: '1' }),
    } as unknown as Repository<SysJobLogEntity>);
    const service = Reflect.construct(JobSchedulerService, [
      repo,
      registry,
      logs,
      new ConfigService({ app: { skipExternalServices: true, role: 'api' } }),
    ]) as JobSchedulerService;

    await expect(service.runOnce('1')).rejects.toThrow('Job queue is unavailable');
    expect(executed).toBe(false);
  });
});

import { Job } from 'bullmq';
import type { JobExecutionData } from '../../src/modules/job/job-queue';

describe('Job timeout safety', () => {
  afterEach(() => jest.useRealTimers());

  it('aborts at deadline but keeps execution pending until the handler settles', async () => {
    jest.useFakeTimers();
    const job = Object.assign(new SysJobEntity(), {
      id: '1',
      name: 'slow',
      invokeTarget: 'slow.handler',
      status: 0,
      concurrent: 0,
      jobGroup: 'default',
      cronExpression: '* * * * *',
    });
    const registry = new JobHandlerRegistry();
    let finish!: (message: string) => void;
    let signal: AbortSignal | undefined;
    registry.register(
      'slow.handler',
      async (context) => {
        signal = context.signal;
        return new Promise<string>((resolve) => {
          finish = resolve;
        });
      },
      'slow',
    );
    const records: Partial<SysJobLogEntity>[] = [];
    const logs = new JobLogService({
      create: (value: Partial<SysJobLogEntity>) => value,
      save: async (value: Partial<SysJobLogEntity>) => {
        records.push(value);
        return value;
      },
    } as unknown as Repository<SysJobLogEntity>);
    const service = new JobSchedulerService(
      { findOne: async () => job } as unknown as Repository<SysJobEntity>,
      registry,
      logs,
      new ConfigService(),
    );
    const execution = {
      id: 'execution-1',
      data: { jobId: '1', source: 'manual' },
      attemptsMade: 0,
      timestamp: Date.now(),
      opts: { attempts: 3 },
    } as unknown as Job<JobExecutionData>;
    const execute = Reflect.get(service, 'execute') as (
      item: Job<JobExecutionData>,
    ) => Promise<string>;
    let settled = false;
    const result = execute.call(service, execution);
    void result.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await jest.advanceTimersByTimeAsync(60000);
    expect(signal?.aborted).toBe(true);
    expect(settled).toBe(false);
    expect(records).toHaveLength(0);
    finish('side effects finally stopped');
    await expect(result).rejects.toThrow('timed out');
    expect(records.map((record) => record.status)).toEqual([0]);
    expect(records[0].message).toContain('已终止');
  });
});
