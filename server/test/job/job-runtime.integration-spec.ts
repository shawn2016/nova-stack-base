import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { fork } from 'child_process';
import { join } from 'path';
import { Repository } from 'typeorm';
import { SysJobEntity, SysJobLogEntity } from '../../src/database/entities';
import {
  JobHandlerRegistry,
  JobExecutionContext,
} from '../../src/modules/job/job-handler.registry';
import { JobLogService } from '../../src/modules/job/job-log.service';
import {
  createJobQueue,
  JOB_OPTIONS,
  JOB_QUEUE_NAME,
  JOB_LOCK_DURATION_MS,
  JOB_STALLED_INTERVAL_MS,
  jobQueueConnection,
  jobQueuePrefix,
} from '../../src/modules/job/job-queue';
import { Queue, Worker } from 'bullmq';
import type { JobExecutionData } from '../../src/modules/job/job-queue';
import { JobSchedulerService } from '../../src/modules/job/job-scheduler.service';

interface RecoverySnapshot {
  elapsedMs: number;
  state: string;
  lockTTL: number;
  stalledCheckTTL: number;
  active: string[];
  stalled: string[];
  ats: string;
  globalConcurrency: string;
}

async function recoverySnapshot(
  queue: Queue<JobExecutionData>,
  executionId: string,
  startTime: number,
): Promise<RecoverySnapshot> {
  const client = await queue.client;
  client.defineCommand('recoverySnapshot', {
    numberOfKeys: 6,
    lua: "return {redis.call('PTTL', KEYS[1]), redis.call('PTTL', KEYS[2]), redis.call('LRANGE', KEYS[3], 0, -1), redis.call('SMEMBERS', KEYS[4]), redis.call('HGET', KEYS[5], 'ats') or '', redis.call('HGET', KEYS[6], 'concurrency') or ''}",
  });
  const [lockTTL, stalledCheckTTL, active, stalled, ats, globalConcurrency] =
    (await client.runCommand('recoverySnapshot', [
      queue.toKey(`${executionId}:lock`),
      queue.toKey('stalled-check'),
      queue.toKey('active'),
      queue.toKey('stalled'),
      queue.toKey(executionId),
      queue.toKey('meta'),
    ])) as [number, number, string[], string[], string, string];
  return {
    elapsedMs: Date.now() - startTime,
    state: (await (await queue.getJob(executionId))?.getState()) ?? 'missing',
    lockTTL,
    stalledCheckTTL,
    active,
    stalled,
    ats,
    globalConcurrency,
  };
}

jest.setTimeout(30000);

const runReal = process.env.JOB_QUEUE_REDIS_TEST === 'true';
const suite = runReal ? describe : describe.skip;

suite('Production job runtime / isolated real Redis', () => {
  const prefix = `nova-job-test-${randomUUID()}:`;
  const config = new ConfigService({
    app: { role: 'worker', skipExternalServices: false },
    redis: {
      host: '127.0.0.1',
      port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
      keyPrefix: prefix,
      db: 0,
    },
  });
  const job = Object.assign(new SysJobEntity(), {
    id: '7001',
    name: 'test',
    jobGroup: 'default',
    invokeTarget: 'test.handler',
    cronExpression: '* * * * * *',
    status: 0,
    concurrent: 0,
  });
  const records: Partial<SysJobLogEntity>[] = [];
  const contexts: JobExecutionContext[] = [];
  let handler: (context: JobExecutionContext) => Promise<string> = async () => 'ok';
  const registry = new JobHandlerRegistry();
  registry.register(
    'test.handler',
    async (context) => {
      contexts.push(context);
      return handler(context);
    },
    'test',
  );
  const repo = {
    find: async () => (job.status === 1 ? [job] : []),
    findOne: async () => job,
  } as unknown as Repository<SysJobEntity>;
  const logs = new JobLogService({
    create: (value: Partial<SysJobLogEntity>) => value,
    save: async (value: Partial<SysJobLogEntity>) => {
      records.push(value);
      return { ...value, id: String(records.length) };
    },
  } as unknown as Repository<SysJobLogEntity>);
  const queue = createJobQueue(config);
  const instances: JobSchedulerService[] = [];
  const start = async (role: 'api' | 'worker' = 'worker') => {
    const instance = new JobSchedulerService(
      repo,
      registry,
      logs,
      new ConfigService({
        app: { role, skipExternalServices: false },
        redis: {
          host: '127.0.0.1',
          port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
          keyPrefix: prefix,
          db: 0,
        },
      }),
    );
    await instance.onModuleInit();
    instances.push(instance);
    return instance;
  };
  const eventually = async (check: () => boolean | Promise<boolean>, timeout = 10000) => {
    const deadline = Date.now() + timeout;
    while (!(await check())) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for job state');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  beforeAll(async () => {
    await queue.waitUntilReady();
  });
  beforeEach(() => {
    job.status = 0;
    job.cronExpression = '* * * * * *';
    records.length = 0;
    contexts.length = 0;
    handler = async () => 'ok';
  });
  afterEach(async () => {
    for (const instance of instances.reverse()) await instance.onModuleDestroy();
    instances.length = 0;
    for (const scheduler of await queue.getJobSchedulers(0, 99))
      await queue.removeJobScheduler(scheduler.key);
    await queue.drain(true);
    await queue.resume();
  });
  afterAll(async () => {
    for (const instance of instances.reverse()) await instance.onModuleDestroy();
    // Only the random test queue's keys are removed; never FLUSHALL/FLUSHDB.
    await queue.obliterate({ force: true });
    await (
      await queue.client
    ).del(
      queue.toKey('completed-watermarks'),
      queue.toKey('pending-occurrences'),
      queue.toKey('schedule-digests'),
      queue.toKey('schedule-sync-lock'),
    );
    await queue.close();
  });

  it('an API only enqueues; a restarted worker recovers waiting work', async () => {
    const api = await start('api');
    const accepted = await api.runOnce(job.id);
    expect(accepted.status).toBe('queued');
    expect(contexts).toHaveLength(0);
    expect(await queue.getWaitingCount()).toBe(1);
    await api.onModuleDestroy();
    await start();
    await eventually(() => contexts.length === 1);
    expect(contexts[0].executionId).toBe(accepted.executionId);
    await eventually(() => records.length === 1);
    expect(records[0].status).toBe(1);
  });

  it('two schedulers share occurrences and completed IDs cannot run again', async () => {
    const first = await start();
    await start();
    const before = contexts.length;
    job.status = 1;
    await Promise.all(instances.map((instance) => instance.schedule(job)));
    await eventually(() => contexts.length > before);
    job.status = 0;
    await first.unschedule(job.id);
    const scheduled = contexts.slice(before);
    expect(scheduled.length).toBe(1);
    const id = scheduled[0].executionId;
    await eventually(async () => (await queue.getJob(id))?.isCompleted() ?? false);
    const completed = await queue.getJob(id);
    const data = completed!.data;
    await completed!.remove(); // Simulate normal bounded-retention eviction.
    job.status = 1;
    await queue.add('execute', data, { jobId: id });
    await eventually(async () => (await queue.getJob(id))?.isCompleted() ?? false);
    job.status = 0;
    expect(contexts.filter((context) => context.executionId === id)).toHaveLength(1);
  });

  it.each(['missing', 'stale'])(
    'unchanged reconciliation preserves an overdue occurrence with %s digest while the lane is occupied',
    async (digestState) => {
      const worker = await start();
      const api = await start('api');
      let release!: (value: string) => void;
      handler = async (context) =>
        context.executionId.startsWith('manual-')
          ? new Promise<string>((resolve) => {
              release = resolve;
            })
          : 'scheduled';
      await worker.runOnce(job.id);
      await eventually(() => Boolean(release));
      try {
        job.status = 1;
        await worker.schedule(job);
        const scheduler = await queue.getJobScheduler(`definition-${job.id}`);
        const dueId = `repeat:definition-${job.id}:${scheduler!.next}`;
        await eventually(() => Date.now() > scheduler!.next! + 100);
        // A new process/version must adopt an existing unchanged scheduler even
        // when its shared digest has not been installed yet.
        if (digestState === 'missing') {
          await (await queue.client).hdel(queue.toKey('schedule-digests'), `definition-${job.id}`);
        } else {
          // Crash window: the upsert committed, but its new digest did not.
          await (
            await queue.client
          ).hset(queue.toKey('schedule-digests'), {
            [`definition-${job.id}`]: 'stale-previous-digest',
          });
        }
        await Promise.all([worker.schedule(job), api.schedule(job), worker.schedule(job)]);
        expect(await queue.getJob(dueId)).toBeDefined();
        release('release lane');
        await eventually(() => contexts.some((context) => context.executionId === dueId));
        job.status = 0;
        await worker.unschedule(job.id);
      } finally {
        release('release lane');
      }
    },
  );

  it.each(['template', 'repeat options'])(
    'repairs actual scheduler %s drift even when the cached digest matches the database',
    async (drift) => {
      const api = await start('api');
      job.status = 1;
      await api.schedule(job);
      await queue.upsertJobScheduler(
        `definition-${job.id}`,
        {
          pattern: job.cronExpression,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(drift === 'repeat options' ? { limit: 1 } : {}),
        },
        {
          name: 'execute',
          data: {
            jobId: job.id,
            source: 'schedule',
            cronExpression: job.cronExpression,
            invokeTarget: drift === 'template' ? 'stale.handler' : job.invokeTarget,
          },
          opts: drift === 'template' ? { ...JOB_OPTIONS, attempts: 1 } : JOB_OPTIONS,
        },
      );
      await api.schedule(job);
      const actual = await queue.getJobScheduler(`definition-${job.id}`);
      expect(actual?.template?.data.invokeTarget).toBe('test.handler');
      expect(actual?.template?.opts?.attempts).toBe(3);
      expect(actual?.limit).toBeUndefined();
      job.status = 0;
    },
  );

  it('terminates a scheduled occurrence after the persisted activation budget is exhausted', async () => {
    await queue.pause();
    job.status = 1;
    const worker = await start();
    const scheduler = await queue.getJobScheduler(`definition-${job.id}`);
    const executionId = `repeat:definition-${job.id}:${scheduler!.next}`;
    // BullMQ's moveToActive Lua increments ats on every claim, including
    // recovery from crashes. Seed three prior starts, then exercise a real claim.
    await (await queue.client).hset(queue.toKey(executionId), { ats: 3 });
    await queue.resume();
    await eventually(async () => (await queue.getJob(executionId))?.isFailed() ?? false);
    job.status = 0;
    await worker.unschedule(job.id);
    expect(contexts.filter((context) => context.executionId === executionId)).toHaveLength(0);
    expect(records.find((record) => record.message?.includes(executionId))?.message).toContain(
      '已终止',
    );
  });

  it('retries a failed attempt under the same execution ID and logs both outcomes', async () => {
    handler = async (context) => {
      if (context.attempt === 1) throw new Error('transient test error');
      return 'recovered';
    };
    const worker = await start();
    const accepted = await worker.runOnce(job.id);
    await eventually(
      async () => (await queue.getJob(accepted.executionId))?.isCompleted() ?? false,
    );
    expect(
      contexts
        .filter((context) => context.executionId === accepted.executionId)
        .map((context) => context.attempt),
    ).toEqual([1, 2]);
    expect(
      records
        .filter((record) => record.message?.includes(accepted.executionId))
        .map((record) => record.status),
    ).toEqual([0, 1]);
  });

  it('preserves an older scheduled retry after a newer occurrence succeeds', async () => {
    await start();
    job.status = 1;
    const oldId = `repeat:definition-7001:${Date.now()}`;
    const newId = `repeat:definition-7001:${Date.now() + 1}`;
    handler = async (context) => {
      if (context.executionId === oldId && context.attempt === 1)
        throw new Error('older occurrence transient failure');
      return 'done';
    };
    const data = {
      jobId: job.id,
      source: 'schedule' as const,
      cronExpression: job.cronExpression,
      invokeTarget: job.invokeTarget,
    };
    await queue.add('execute', data, { jobId: oldId });
    await queue.add('execute', data, { jobId: newId });
    await eventually(async () => (await queue.getJob(oldId))?.isCompleted() ?? false);
    expect(
      contexts.filter((context) => context.executionId === oldId).map((context) => context.attempt),
    ).toEqual([1, 2]);
    expect(contexts.filter((context) => context.executionId === newId)).toHaveLength(1);
    job.status = 0;
  });

  it('keeps one global execution lane across two worker instances', async () => {
    let active = 0;
    let maximum = 0;
    handler = async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 50));
      active -= 1;
      return 'done';
    };
    const first = await start();
    const second = await start();
    const accepted = await Promise.all([first.runOnce(job.id), second.runOnce(job.id)]);
    await eventually(async () =>
      (
        await Promise.all(
          accepted.map(async (item) => (await queue.getJob(item.executionId))?.isCompleted()),
        )
      ).every(Boolean),
    );
    expect(maximum).toBe(1);
  });

  it('graceful closure lets the active handler commit completion before releasing its claim', async () => {
    const drainConfig = new ConfigService({
      app: { role: 'worker', skipExternalServices: false },
      redis: {
        host: '127.0.0.1',
        port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
        keyPrefix: `${prefix}drain:`,
        db: 0,
      },
    });
    const drainQueue = createJobQueue(drainConfig);
    const runtime = new JobSchedulerService(repo, registry, logs, drainConfig);
    let finish!: (message: string) => void;
    let started = false;
    handler = async () => {
      started = true;
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    };
    try {
      job.status = 0;
      await runtime.onModuleInit();
      await drainQueue.waitUntilReady();
      job.status = 1;
      const executionId = `repeat:definition-7001:${Date.now()}`;
      await drainQueue.add(
        'execute',
        {
          jobId: job.id,
          source: 'schedule',
          cronExpression: job.cronExpression,
          invokeTarget: job.invokeTarget,
        },
        { jobId: executionId },
      );
      await eventually(() => started);
      const closing = runtime.onModuleDestroy();
      finish('drained');
      await closing;
      expect(await (await drainQueue.getJob(executionId))?.isCompleted()).toBe(true);
      expect(
        records
          .filter((record) => record.message?.includes(executionId))
          .map((record) => record.status),
      ).toEqual([1]);
    } finally {
      job.status = 0;
      await runtime.onModuleDestroy();
      await drainQueue.obliterate({ force: true });
      await (
        await drainQueue.client
      ).del(drainQueue.toKey('completed-watermarks'), drainQueue.toKey('pending-occurrences'));
      await drainQueue.close();
    }
  });

  it('a denied shared check does not advance the two-phase stalled protocol', async () => {
    const protocolConfig = new ConfigService({
      redis: {
        host: '127.0.0.1',
        port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
        keyPrefix: `${prefix}protocol:`,
        db: 0,
      },
    });
    const protocolQueue = createJobQueue(protocolConfig);
    const connection = jobQueueConnection(protocolConfig);
    delete connection.commandTimeout;
    const probe = new Worker<JobExecutionData>(JOB_QUEUE_NAME, undefined, {
      connection: { ...connection, maxRetriesPerRequest: null, enableOfflineQueue: true },
      prefix: jobQueuePrefix(protocolConfig),
      autorun: false,
      skipStalledCheck: true,
      lockDuration: 30000,
      stalledInterval: 30000,
    });
    try {
      await protocolQueue.waitUntilReady();
      await protocolQueue.setGlobalConcurrency(1);
      await probe.moveStalledJobsToWait(); // Checks an empty active set and installs the shared gate.
      const executionId = `protocol-${randomUUID()}`;
      await protocolQueue.add(
        'execute',
        { jobId: job.id, source: 'manual' },
        { jobId: executionId },
      );
      expect((await probe.getNextJob('first-claim', { block: false }))?.id).toBe(executionId);
      const client = await protocolQueue.client;
      await client.del(protocolQueue.toKey(`${executionId}:lock`)); // Model lock expiry after SIGKILL.
      await probe.moveStalledJobsToWait(); // A tick still inside the shared gate is denied.
      const denied = await recoverySnapshot(protocolQueue, executionId, Date.now());
      expect(denied).toMatchObject({
        lockTTL: -2,
        active: [executionId],
        stalled: [],
        ats: '1',
        globalConcurrency: '1',
      });
      expect(denied.stalledCheckTTL).toBeGreaterThan(0);
      expect(await probe.getNextJob('must-not-overlap', { block: false })).toBeUndefined();
      await client.del(protocolQueue.toKey('stalled-check')); // Model the next eligible check.
      await probe.moveStalledJobsToWait();
      expect(await recoverySnapshot(protocolQueue, executionId, Date.now())).toMatchObject({
        active: [executionId],
        stalled: [executionId],
        ats: '1',
      });
      await client.del(protocolQueue.toKey('stalled-check')); // A second eligible check is required.
      await probe.moveStalledJobsToWait();
      expect(await recoverySnapshot(protocolQueue, executionId, Date.now())).toMatchObject({
        active: [],
        stalled: [],
        ats: '1',
        state: 'waiting',
      });
      const recovered = await probe.getNextJob('recovery-claim', { block: false });
      expect(recovered?.attemptsStarted).toBe(2);
      await recovered?.moveToCompleted('recovered', 'recovery-claim', false);
    } finally {
      await probe.close(true);
      await protocolQueue.obliterate({ force: true });
      await protocolQueue.close();
    }
  });

  it('recovers an active execution after a separate worker process is killed', async () => {
    const crashPrefix = `${prefix}crash:`;
    const crashConfig = new ConfigService({
      app: { role: 'worker', skipExternalServices: false },
      redis: {
        host: '127.0.0.1',
        port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
        keyPrefix: crashPrefix,
        db: 0,
      },
    });
    const crashQueue = createJobQueue(crashConfig);
    const child = fork(join(__dirname, 'fixtures/crash-worker.ts'), [], {
      execArgv: ['-r', 'ts-node/register/transpile-only'],
      env: {
        ...process.env,
        TS_NODE_PROJECT: join(process.cwd(), 'tsconfig.json'),
        JOB_CRASH_TEST_PREFIX: crashPrefix,
      },
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let recovery: JobSchedulerService | undefined;
    try {
      const claimed = new Promise<unknown>((resolve, reject) => {
        child.once('message', resolve);
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`Crash fixture exited early: ${code}`)));
      });
      await crashQueue.waitUntilReady();
      const executionId = `crash-${randomUUID()}`;
      await crashQueue.add('execute', { jobId: job.id, source: 'manual' }, { jobId: executionId });
      const claim = (await claimed) as {
        executionId: string;
        stalledInterval: number;
        lockDuration: number;
      };
      expect(claim).toEqual({
        executionId,
        lockDuration: JOB_LOCK_DURATION_MS,
        stalledInterval: JOB_STALLED_INTERVAL_MS,
      });
      child.kill('SIGKILL');
      await new Promise<void>((resolve) => child.once('exit', () => resolve()));
      // Exercise an adverse shared-check phase: the recovery worker's first
      // interval tick still sees a valid gate, so it must not assume that every
      // timer tick advances the two-phase stalled protocol.
      await (
        await crashQueue.client
      ).set(crashQueue.toKey('stalled-check'), String(Date.now()), {
        PX: claim.stalledInterval + 500,
      });
      handler = async () => 'recovered-after-crash';
      recovery = new JobSchedulerService(repo, registry, logs, crashConfig);
      await recovery.onModuleInit();
      const recoveryStart = Date.now();
      const snapshots: RecoverySnapshot[] = [];
      let nextSnapshot = 0;
      try {
        await eventually(
          async () => {
            const snapshot = await recoverySnapshot(crashQueue, executionId, recoveryStart);
            if (snapshot.elapsedMs >= nextSnapshot || snapshot.state === 'completed') {
              snapshots.push(snapshot);
              nextSnapshot += 5000;
            }
            return snapshot.state === 'completed';
          },
          claim.lockDuration + 3 * claim.stalledInterval + 5000,
        );
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : 'Recovery failed'}; diagnostics=${JSON.stringify(snapshots)}`,
        );
      }
      console.log(JSON.stringify({ scenario: 'worker-crash-recovery-phases', snapshots }));
      expect(contexts.filter((context) => context.executionId === executionId)).toHaveLength(1);
      expect(records.find((record) => record.message?.includes(executionId))?.status).toBe(1);
    } finally {
      child.kill('SIGKILL');
      await recovery?.onModuleDestroy();
      await crashQueue.obliterate({ force: true });
      await crashQueue.close();
    }
  }, 90000);
});
