import type { Request } from 'express';

/** Express 按 bootstrap 中的可信代理跳数解析 IP；绝不自行信任 XFF 首段。 */
export function resolveClientIp(req: Request, _trustProxy: boolean): string {
  return req.ip ?? req.socket?.remoteAddress ?? '';
}
