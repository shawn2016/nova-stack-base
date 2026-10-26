import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './runtime/structured-logger';

/** Application context only: no HTTP socket and no request-serving worker. */
async function bootstrap(): Promise<void> {
  process.env.APP_ROLE = 'worker';
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new StructuredLogger(),
  });
  app.enableShutdownHooks();
}

void bootstrap().catch(() => {
  // Startup errors may contain connection credentials. Keep the public log safe.
  console.error('Worker startup failed');
  process.exitCode = 1;
});
