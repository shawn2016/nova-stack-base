import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { isDeepStrictEqual } from 'node:util';
import type { RunJobResult } from '@nova/shared-types';
import { SysJobEntity } from '../../database/entities';
import { JobHandlerRegistry } from './job-handler.registry';
import { JobLogService } from './job-log.service';
import { createJobQueue, createJobWorker, JOB_OPTIONS, JobExecutionData } from './job-queue';

@Injectable()
export class JobSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private queue: Queue<JobExecutionData> | null = null;
  private worker: Worker<JobExecutionData, string> | null = null;
  private reconcileTimer: NodeJS.Timeout | null = null;
  private reconciliation: Promise<void> | null = null;
  private closing = false;

  constructor(
    @InjectRepository(SysJobEntity)
    private readonly jobRepo: Repository<SysJobEntity>,
    private readonly handlerRegistry: JobHandlerRegistry,
    private readonly jobLogService: JobLogService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<boolean>('app.skipExternalServices', false)) return;
    this.queue = createJobQueue(this.config);
    this.queue.on('error', () => this.logger.error('Job queue Redis connection failed'));
    await this.queue.waitUntilReady();
    // One global lane is deliberate: concurrent=0 must hold across processes,
    // including manual runs. Additional workers improve availability, not capacity.
    await this.queue.setGlobalConcurrency(1);
    const role =
      this.config.get<string>('app.role') ??
      (process.env.NODE_ENV === 'production' ? 'api' : 'all');
    if (role === 'api') return;
    await this.reconcile();
    this.worker = createJobWorker(this.config, (job) => this.execute(job));
    this.worker.on('error', () => this.logger.error('Job worker Redis connection failed'));
    this.worker.on('failed', (job) => {
      this.logger.warn(
        `Job attempt failed executionId=${job?.id ?? 'unknown'} attempt=${job?.attemptsMade ?? 0}`,
      );
      if (job)
        void this.clearTerminalFailure(job).catch(() =>
          this.logger.error('Job failure metadata cleanup failed'),
        );
    });
    this.reconcileTimer = setInterval(() => {
      void this.reconcile().catch(() => this.logger.error('Job schedule reconciliation failed'));
    }, 15000);
    this.reconcileTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
    await this.reconciliation?.catch(() => undefined);
    // Do not force-close an active handler: keep its renewable claim until it
    // settles, so a timeout cannot silently overlap the next side effect.
    await this.worker?.close();
    await this.queue?.close();
    this.worker = null;
    this.queue = null;
  }

  async schedule(_job: SysJobEntity): Promise<void> {
    // Read the authoritative row, not a possibly stale entity from another API.
    await this.reconcile();
  }

  async unschedule(_jobId: string): Promise<void> {
    await this.reconcile();
  }

  async runOnce(jobId: string): Promise<RunJobResult> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (this.closing) throw new ServiceUnavailableException('Job queue is unavailable');
    const queue = this.requireQueue();
    const executionId = `manual-${jobId}-${randomUUID()}`;
    try {
      await queue.add('execute', { jobId, source: 'manual' }, { jobId: executionId });
    } catch {
      throw new ServiceUnavailableException('Job queue is unavailable');
    }
    return { executionId, status: 'queued', message: '已排队，请在任务日志中查看执行结果' };
  }

  private requireQueue(): Queue<JobExecutionData> {
    if (!this.queue) throw new ServiceUnavailableException('Job queue is unavailable');
    return this.queue;
  }

  private async reconcile(): Promise<void> {
    if (!this.queue || this.closing) return;
    if (this.reconciliation) return this.reconciliation;
    this.reconciliation = this.syncSchedules();
    try {
      await this.reconciliation;
    } finally {
      this.reconciliation = null;
    }
  }

  private async syncSchedules(): Promise<void> {
    const queue = this.requireQueue();
    const client = await queue.client;
    const lockKey = queue.toKey('schedule-sync-lock');
    const token = randomUUID();
    client.defineCommand('scheduleLease', {
      numberOfKeys: 1,
      lua: "if ARGV[1] == 'acquire' then return redis.call('SET', KEYS[1], ARGV[2], 'NX', 'PX', 30000); end; if redis.call('GET', KEYS[1]) ~= ARGV[2] then return 0; end; if ARGV[1] == 'renew' then return redis.call('PEXPIRE', KEYS[1], 30000); end; return redis.call('DEL', KEYS[1])",
    });
    const deadline = Date.now() + 5000;
    while ((await client.runCommand('scheduleLease', [lockKey, 'acquire', token])) !== 'OK') {
      if (Date.now() >= deadline)
        throw new ServiceUnavailableException('Job schedule coordination is busy');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    let leaseLost = false;
    const renew = setInterval(() => {
      void client
        .runCommand('scheduleLease', [lockKey, 'renew', token])
        .then((result: unknown) => {
          if (result !== 1) leaseLost = true;
        })
        .catch(() => {
          leaseLost = true;
        });
    }, 5000);
    renew.unref();
    const assertLease = async () => {
      if (leaseLost || (await client.get(lockKey)) !== token)
        throw new ServiceUnavailableException('Job schedule coordination lease expired');
    };
    try {
      await this.syncSchedulesUnderLease(assertLease);
    } finally {
      clearInterval(renew);
      await client.runCommand('scheduleLease', [lockKey, 'release', token]);
    }
  }

  private async syncSchedulesUnderLease(assertLease: () => Promise<void>): Promise<void> {
    const queue = this.requireQueue();
    const client = await queue.client;
    const digestKey = queue.toKey('schedule-digests');
    // Read MySQL only after acquiring the shared lease, so competing API and
    // worker reconcilers cannot publish snapshots read before another mutation.
    const jobs = await this.jobRepo.find({ where: { status: 1 } });
    const wanted = new Set(jobs.map((job) => `definition-${job.id}`));
    for (const job of jobs) {
      await assertLease();
      const schedulerId = `definition-${job.id}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const digest = createHash('sha256')
        .update(
          JSON.stringify({
            pattern: job.cronExpression,
            invokeTarget: job.invokeTarget,
            timezone,
            options: JOB_OPTIONS,
          }),
        )
        .digest('hex');
      const previousDigest = await client.hget(digestKey, schedulerId);
      const existing = await queue.getJobScheduler(schedulerId);
      const desiredData: JobExecutionData = {
        jobId: job.id,
        source: 'schedule',
        cronExpression: job.cronExpression,
        invokeTarget: job.invokeTarget,
      };
      // The scheduler is authoritative, not the digest. A crash can commit the
      // upsert without publishing its digest, or leave a matching digest beside
      // a changed scheduler. Compare the complete persisted definition first.
      if (
        existing?.name === 'execute' &&
        existing.pattern === job.cronExpression &&
        existing.tz === timezone &&
        existing.every === undefined &&
        existing.limit === undefined &&
        existing.startDate === undefined &&
        existing.endDate === undefined &&
        isDeepStrictEqual(existing.template?.data, desiredData) &&
        isDeepStrictEqual(existing.template?.opts, JOB_OPTIONS)
      ) {
        if (previousDigest !== digest) {
          await assertLease();
          await client.hset(digestKey, { [schedulerId]: digest });
        }
        continue;
      }
      // Upsert is atomic in Redis and shares deterministic occurrence IDs across
      // every API/worker. Existing completed occurrences are never re-enqueued.
      await queue.upsertJobScheduler(
        `definition-${job.id}`,
        {
          pattern: job.cronExpression,
          tz: timezone,
        },
        {
          name: 'execute',
          data: desiredData,
          opts: JOB_OPTIONS,
        },
      );
      await assertLease();
      await client.hset(digestKey, { [schedulerId]: digest });
    }
    // Bound each Redis read; no KEYS or unbounded scheduler result fetch.
    const obsolete: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const schedulers = await queue.getJobSchedulers(offset, offset + 99);
      for (const scheduler of schedulers) {
        if (!wanted.has(scheduler.key)) obsolete.push(scheduler.key);
      }
      if (schedulers.length < 100) break;
    }
    for (const key of obsolete) {
      await assertLease();
      await queue.removeJobScheduler(key);
      await client.hdel(digestKey, key);
    }
  }

  private async clearPendingExecution(execution: Job<JobExecutionData>): Promise<void> {
    if (execution.data.source !== 'schedule' || !execution.id || !this.queue) return;
    const client = await this.queue.client;
    await client.hdel(this.queue.toKey('pending-occurrences'), execution.id);
  }

  private async clearTerminalFailure(execution: Job<JobExecutionData>): Promise<void> {
    if ((await execution.getState()) === 'failed') await this.clearPendingExecution(execution);
  }

  private async execute(execution: Job<JobExecutionData>): Promise<string> {
    const job = await this.jobRepo.findOne({ where: { id: execution.data.jobId } });
    if (!job) {
      await this.clearPendingExecution(execution);
      return 'Skipped deleted job';
    }
    if (
      execution.data.source === 'schedule' &&
      (job.status !== 1 ||
        job.cronExpression !== execution.data.cronExpression ||
        job.invokeTarget !== execution.data.invokeTarget)
    ) {
      await this.clearPendingExecution(execution);
      return 'Skipped stale or paused schedule';
    }
    const occurrence =
      execution.data.source === 'schedule' ? Number(execution.id?.split(':').at(-1)) : null;
    if (occurrence !== null) {
      if (!Number.isSafeInteger(occurrence) || occurrence <= 0) {
        throw new UnrecoverableError('Invalid scheduled occurrence ID');
      }
      const client = await this.requireQueue().client;
      const completed = await client.hget(
        this.requireQueue().toKey('completed-watermarks'),
        job.id,
      );
      const pending = execution.id
        ? await client.hexists(this.requireQueue().toKey('pending-occurrences'), execution.id)
        : 0;
      if (completed && occurrence <= Number(completed) && !pending)
        return 'Skipped completed scheduled occurrence';
      await client.hset(this.requireQueue().toKey('pending-occurrences'), {
        [execution.id!]: job.id,
      });
    }
    const handler = this.handlerRegistry.get(job.invokeTarget);
    const executionId = execution.id ?? String(execution.timestamp);
    const attempt = execution.attemptsStarted || execution.attemptsMade + 1;
    const start = new Date();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error('Job execution timeout'));
      this.logger.error(`Job timeout; waiting for handler settlement executionId=${executionId}`);
    }, 60000);
    timer.unref();
    try {
      // BullMQ repeatable jobs bypass maxStalledCount; ats is still atomically
      // incremented by moveToActive for every claim, including stalled recovery.
      if (execution.attemptsStarted > 3)
        throw new UnrecoverableError('Job activation budget exhausted');
      if (!handler) throw new UnrecoverableError(`Handler not found: ${job.invokeTarget}`);
      const message = await handler({ executionId, attempt, signal: controller.signal });
      if (timedOut)
        throw new UnrecoverableError('Job timed out; handler settled after cancellation');
      await this.jobLogService.recordSuccess(
        job,
        `[${executionId} attempt=${attempt}] ${message}`,
        start,
      );
      if (occurrence !== null) {
        const client = await this.requireQueue().client;
        // Constant-size history per definition outlives bounded BullMQ job
        // retention. Pending markers preserve unfinished retries across newer success.
        client.defineCommand('markOccurrenceComplete', {
          numberOfKeys: 2,
          lua: "local previous = redis.call('HGET', KEYS[1], ARGV[1]); if not previous or tonumber(previous) < tonumber(ARGV[2]) then redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]); end; redis.call('HDEL', KEYS[2], ARGV[3]); return 1",
        });
        await client.runCommand('markOccurrenceComplete', [
          this.requireQueue().toKey('completed-watermarks'),
          this.requireQueue().toKey('pending-occurrences'),
          job.id,
          String(occurrence),
          executionId,
        ]);
      }
      return message;
    } catch (error) {
      const failure = timedOut ? new UnrecoverableError('Job execution timed out') : error;
      await this.jobLogService.recordFailure(job, failure, start, {
        executionId,
        attempt,
        retry: !(failure instanceof UnrecoverableError) && attempt < (execution.opts.attempts ?? 1),
      });
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }
}
