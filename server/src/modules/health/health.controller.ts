import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/decorators/public.decorator';
import { ReadinessService } from './readiness.service';
import { MetricsService } from '../../runtime/metrics.service';
import { RuntimeSettings } from '../../runtime/runtime-settings';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly readiness: ReadinessService,
    private readonly metricsService: MetricsService,
    private readonly settings: RuntimeSettings,
  ) {}
  @Public()
  @Get()
  @ApiOperation({ summary: '兼容进程存活检查' })
  check() {
    return { status: 'ok' };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: '进程存活检查' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: '数据库与 Redis 就绪检查' })
  async ready() {
    const result = await this.readiness.check();
    if (!result.ready) throw new ServiceUnavailableException('Dependencies unavailable');
    return result;
  }

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: '运维指标（独立 METRICS_TOKEN 保护）' })
  async metrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    const token = this.settings.values.metricsToken;
    if (!token) throw new NotFoundException();
    const expected = Buffer.from(`Bearer ${token}`);
    const received = Buffer.from(authorization ?? '');
    if (received.length !== expected.length || !timingSafeEqual(received, expected))
      throw new UnauthorizedException();
    response
      .type(this.metricsService.registry.contentType)
      .send(await this.metricsService.registry.metrics());
  }
}
