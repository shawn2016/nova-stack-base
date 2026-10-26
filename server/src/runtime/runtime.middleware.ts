import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { resolveClientIp } from '../common/utils/resolve-client-ip';
import { MetricsService } from './metrics.service';
import { RateLimitService } from './rate-limit.service';
import { RuntimeSettings } from './runtime-settings';

@Injectable()
export class RuntimeMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpAccess');
  constructor(
    private readonly settings: RuntimeSettings,
    private readonly metrics: MetricsService,
    private readonly limiter: RateLimitService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const inputId = req.headers['x-request-id'];
    const requestId =
      typeof inputId === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(inputId)
        ? inputId
        : randomUUID();
    res.setHeader('X-Request-ID', requestId);
    const started = performance.now();
    res.once('finish', () => {
      // 路由模板有界；未知路径统一归类，避免 ID/手机号造成指标高基数。
      const route = typeof req.route?.path === 'string' ? String(req.route.path) : 'unmatched';
      const duration = (performance.now() - started) / 1000;
      this.metrics.requests.inc({ method: req.method, route, status: String(res.statusCode) });
      this.metrics.latency.observe({ method: req.method, route }, duration);
      if (process.env.NODE_ENV !== 'test')
        this.logger.log({
          requestId,
          method: req.method,
          route,
          status: res.statusCode,
          durationMs: Math.round(duration * 1000),
        });
    });
    for (const name of ['page', 'pageSize', 'current', 'size']) {
      const value: unknown = req.query[name];
      if (
        value !== undefined &&
        (typeof value !== 'string' ||
          !/^[1-9]\d*$/.test(value) ||
          Number(value) > (name === 'pageSize' || name === 'size' ? 100 : 100000))
      ) {
        res.status(400).json({ code: 400, message: 'Invalid pagination bounds', data: null });
        return;
      }
    }
    if (
      !this.settings.values.rateLimitEnabled ||
      /^\/api\/health(?:\/(?:live|ready|metrics))?$/.test(req.path)
    )
      return next();
    const policy = /\/auth\/(?:login|register|refresh)$/.test(req.path)
      ? 'login'
      : req.path.endsWith('/files/upload')
        ? 'upload'
        : 'api';
    try {
      const decision = await this.limiter.take(
        resolveClientIp(req, this.settings.values.trustProxy),
        policy,
      );
      res.setHeader('X-RateLimit-Remaining', decision.remaining);
      if (!decision.allowed) {
        this.metrics.rejected.inc({ policy });
        res.setHeader('Retry-After', decision.retryAfter);
        res.status(429).json({ code: 429, message: '请求过于频繁，请稍后重试', data: null });
        return;
      }
      next();
    } catch {
      res.status(503).json({ code: 503, message: 'Service unavailable', data: null });
    }
  }
}
