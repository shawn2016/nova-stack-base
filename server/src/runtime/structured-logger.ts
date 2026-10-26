import type { LoggerService } from '@nestjs/common';

const SECRET_KEY = /password|secret|token|authorization|cookie|access.?key|private.?key/i;

/** 日志仅保留有界脱敏字段；请求体、查询和认证头不进入访问日志。 */
export function redactLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (typeof value === 'string')
    return value
      .slice(0, 4096)
      .replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]')
      .replace(/(password|secret|token|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
      .replace(/:\/\/[^/@\s]+:[^/@\s]+@/g, '://[redacted]@');
  if (value instanceof Error)
    return { name: value.name, message: redactLog(value.message, depth + 1) };
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactLog(item, depth + 1));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          SECRET_KEY.test(key) ? '[redacted]' : redactLog(item, depth + 1),
        ]),
    );
  return value;
}

export class StructuredLogger implements LoggerService {
  log(message: unknown, ...context: unknown[]) {
    this.write('info', message, context);
  }
  error(message: unknown, ...context: unknown[]) {
    this.write('error', message, context);
  }
  warn(message: unknown, ...context: unknown[]) {
    this.write('warn', message, context);
  }
  debug(message: unknown, ...context: unknown[]) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, ...context: unknown[]) {
    this.write('debug', message, context);
  }
  private write(level: string, message: unknown, context: unknown[]) {
    process.stdout.write(
      `${JSON.stringify({ time: new Date().toISOString(), level, message: redactLog(message), context: redactLog(context) })}\n`,
    );
  }
}
