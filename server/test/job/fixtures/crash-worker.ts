import { ConfigService } from '@nestjs/config';
import { createJobWorker } from '../../../src/modules/job/job-queue';

const worker = createJobWorker(
  new ConfigService({
    redis: {
      host: '127.0.0.1',
      port: Number(process.env.JOB_TEST_REDIS_PORT ?? '16389'),
      keyPrefix: process.env.JOB_CRASH_TEST_PREFIX,
      db: 0,
    },
  }),
  async (job) => {
    process.send?.({
      executionId: job.id,
      stalledInterval: worker.opts.stalledInterval,
      lockDuration: worker.opts.lockDuration,
    });
    // Simulate a process dying after it claimed persistent work, before completion.
    return new Promise<string>(() => undefined);
  },
);
worker.on('error', () => process.exit(2));
