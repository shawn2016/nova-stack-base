import { Injectable, OnModuleInit } from '@nestjs/common';

/** Stable across retries; handlers must atomically deduplicate external effects. */
export interface JobExecutionContext {
  executionId: string;
  attempt: number;
  signal: AbortSignal;
}

export type JobHandlerFn = (context: JobExecutionContext) => Promise<string>;

@Injectable()
export class JobHandlerRegistry implements OnModuleInit {
  private readonly handlers = new Map<string, JobHandlerFn>();
  private readonly descriptions = new Map<string, string>();

  onModuleInit(): void {
    this.register('demo.heartbeat', async () => 'heartbeat ok', 'Demo 心跳任务');
  }

  register(key: string, handler: JobHandlerFn, description: string): void {
    this.handlers.set(key, handler);
    this.descriptions.set(key, description);
  }

  get(key: string): JobHandlerFn | undefined {
    return this.handlers.get(key);
  }

  has(key: string): boolean {
    return this.handlers.has(key);
  }

  listHandlers(): { key: string; description: string }[] {
    return [...this.handlers.keys()].map((key) => ({
      key,
      description: this.descriptions.get(key) ?? key,
    }));
  }
}
