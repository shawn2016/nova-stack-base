import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { resolveClientIp } from '../../common/utils/resolve-client-ip';
import { IpBlacklistService } from './ip-blacklist.service';

@Injectable()
export class IpBlacklistMiddleware implements NestMiddleware {
  constructor(
    private readonly ipBlacklistService: IpBlacklistService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const trustProxy = this.configService.get<boolean>('ipBlacklist.trustProxy') ?? false;
    const ip = resolveClientIp(req, trustProxy);
    const { blocked, reason } = await this.ipBlacklistService.isBlocked(ip);

    if (blocked) {
      throw new ForbiddenException(reason ?? 'Access denied: IP blocked');
    }

    next();
  }
}
