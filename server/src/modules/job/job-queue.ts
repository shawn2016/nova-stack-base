import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue, Worker, Job } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export const JOB_QUEUE_NAME = 'scheduled-jobs';
export const JOB_LOCK_DURATION_MS = 30000;
// Shared stalled-check gates can deny a timer tick; each recovery also needs
// separate mark/reclaim passes. Poll more frequently than the renewable lock.
export const JOB_STALLED_INTERVAL_MS = 10000;

/** A scheduled revision is checked against MySQL before invoking any handler. */
export interface JobExecutionData {
  jobId: string;
  source: 'manual' | 'schedule';
  cronExpression?: string;
  invokeTarget?: string;
}

export function jobQueueConnection(config: ConfigService): RedisOptions {
  return {
    host: config.get<string>('redis.host', 'localhost'),
    port: config.get<number>('redis.port', 6379),
    db: config.get<number>('redis.db', 0),
    username: config.get<string>('redis.username') || undefined,
    password: config.get<string>('redis.password') || undefined,
    tls: config.get<boolean>('redis.tls') ? {} : undefined,
    connectTimeout: config.get<number>('redis.connectTimeout', 10000),
    commandTimeout: config.get<number>('redis.commandTimeout', 5000),
    // Producers fail promptly; the worker overrides this for persistent recovery.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
}

export function jobQueuePrefix(config: ConfigService): string {
  // BullMQ owns all key construction: never pass ioredis's keyPrefix option.
  return `${config.get<string>('redis.keyPrefix', 'nova:')}queue`;
}

export const JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 7 * 86400, count: 10000 },
  removeOnFail: { age: 30 * 86400, count: 10000 },
};

export function createJobQueue(config: ConfigService): Queue<JobExecutionData> {
  const queue = new Queue<JobExecutionData>(JOB_QUEUE_NAME, {
    connection: jobQueueConnection(config),
    prefix: jobQueuePrefix(config),
    defaultJobOptions: JOB_OPTIONS,
  });
  return queue;
}

export function createJobWorker(
  config: ConfigService,
  processor: (job: Job<JobExecutionData>) => Promise<string>,
): Worker<JobExecutionData, string> {
  const connection = jobQueueConnection(config);
  // BullMQ uses blocking Redis reads: a general command timeout interrupts its
  // stalled-job recovery loop. Producer commands remain bounded separately.
  delete connection.commandTimeout;
  return new Worker<JobExecutionData, string>(JOB_QUEUE_NAME, processor, {
    connection: { ...connection, maxRetriesPerRequest: null, enableOfflineQueue: true },
    prefix: jobQueuePrefix(config),
    concurrency: 1,
    maxStalledCount: 1,
    lockDuration: JOB_LOCK_DURATION_MS,
    stalledInterval: JOB_STALLED_INTERVAL_MS,
  });
}
