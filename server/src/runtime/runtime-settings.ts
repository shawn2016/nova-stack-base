import { Injectable } from '@nestjs/common';

type Environment = Record<string, string | undefined>;

/** 有界运行参数；生产环境拒绝关闭入口保护。 */
export function readRuntimeSettings(env: Environment = process.env) {
  const integer = (name: string, fallback: number, max: number) => {
    const value = env[name] === undefined ? fallback : Number(env[name]);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`${name} is out of range`);
    return value;
  };
  const boolean = (name: string, fallback: boolean) => {
    if (env[name] === undefined) return fallback;
    if (env[name] !== 'true' && env[name] !== 'false')
      throw new Error(`${name} must be true or false`);
    return env[name] === 'true';
  };
  const production = env.NODE_ENV === 'production';
  const rateLimitEnabled = boolean('RATE_LIMIT_ENABLED', env.NODE_ENV !== 'test');
  if (production && !rateLimitEnabled)
    throw new Error('Production rate limiting cannot be disabled');
  const metricsToken = env.METRICS_TOKEN ?? '';
  if (metricsToken && metricsToken.trim().length < 32)
    throw new Error('METRICS_TOKEN must be at least 32 characters');
  return {
    production,
    rateLimitEnabled,
    rateLimit: integer('RATE_LIMIT_MAX', 120, 100000),
    loginLimit: integer('LOGIN_RATE_LIMIT_MAX', 10, 1000),
    uploadLimit: integer('UPLOAD_RATE_LIMIT_MAX', 20, 1000),
    rateWindowMs: integer('RATE_LIMIT_WINDOW_MS', 60000, 3600000),
    bodyLimitKb: integer('REQUEST_BODY_LIMIT_KB', 256, 10240),
    readinessTimeoutMs: integer('READINESS_TIMEOUT_MS', 2000, 10000),
    metricsToken,
    trustProxy: boolean('TRUST_PROXY', false),
  };
}

@Injectable()
export class RuntimeSettings {
  readonly values = readRuntimeSettings();
}
