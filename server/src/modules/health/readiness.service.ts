import { Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { RuntimeSettings } from '../../runtime/runtime-settings';
import { MetricsService } from '../../runtime/metrics.service';

@Injectable()
export class ReadinessService {
  private closing = false;
  private probe: Promise<{
    ready: boolean;
    dependencies: { database: boolean; redis: boolean };
  }> | null = null;
  constructor(
    @Optional() private readonly database: DataSource,
    private readonly redisService: RedisService,
    private readonly settings: RuntimeSettings,
    private readonly metrics: MetricsService,
  ) {}
  drain() {
    this.closing = true;
  }
  beforeApplicationShutdown() {
    this.drain();
  }
  async check() {
    if (this.closing) return { ready: false, dependencies: { database: false, redis: false } };
    // 单进程只保留一个进行中的探测，超时后未结束的 DB 操作不重复堆积。
    if (!this.probe)
      this.probe = this.inspect().finally(() => {
        this.probe = null;
      });
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        this.probe,
        new Promise<{ ready: false; dependencies: { database: false; redis: false } }>(
          (resolve) => {
            timer = setTimeout(
              () => resolve({ ready: false, dependencies: { database: false, redis: false } }),
              this.settings.values.readinessTimeoutMs,
            );
            timer.unref();
          },
        ),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }
  private async inspect() {
    const redis = this.redisService.getClient();
    const [databaseResult, redisResult] = await Promise.allSettled([
      this.database?.isInitialized
        ? this.database.query('SELECT 1')
        : Promise.reject(new Error('database unavailable')),
      redis?.status === 'ready' ? redis.ping() : Promise.reject(new Error('redis unavailable')),
    ]);
    const database = databaseResult.status === 'fulfilled';
    const cache = redisResult.status === 'fulfilled';
    this.metrics.dependencies.set({ dependency: 'database' }, database ? 1 : 0);
    this.metrics.dependencies.set({ dependency: 'redis' }, cache ? 1 : 0);
    return { ready: database && cache && !this.closing, dependencies: { database, redis: cache } };
  }
}
