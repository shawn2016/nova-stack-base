import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from '@prometheus-io/client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();
  readonly requests = new Counter({
    name: 'nova_http_requests_total',
    help: 'Completed HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });
  readonly latency = new Histogram({
    name: 'nova_http_request_duration_seconds',
    help: 'HTTP duration',
    labelNames: ['method', 'route'] as const,
    buckets: [0.005, 0.02, 0.05, 0.1, 0.3, 1, 3, 10],
    registers: [this.registry],
  });
  readonly rejected = new Counter({
    name: 'nova_rate_limit_rejected_total',
    help: 'Requests rejected by distributed limiter',
    labelNames: ['policy'] as const,
    registers: [this.registry],
  });
  readonly dependencies = new Gauge({
    name: 'nova_dependency_ready',
    help: 'Dependency readiness on latest probe',
    labelNames: ['dependency'] as const,
    registers: [this.registry],
  });
  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'nova_' });
  }
  onModuleDestroy() {
    this.registry.clear();
  }
}
