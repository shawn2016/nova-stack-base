import { Global, Module } from '@nestjs/common';
import { RuntimeSettings } from './runtime-settings';
import { MetricsService } from './metrics.service';
import { RateLimitService } from './rate-limit.service';
import { RuntimeMiddleware } from './runtime.middleware';

@Global()
@Module({
  providers: [RuntimeSettings, MetricsService, RateLimitService, RuntimeMiddleware],
  exports: [RuntimeSettings, MetricsService, RateLimitService, RuntimeMiddleware],
})
export class RuntimeModule {}
