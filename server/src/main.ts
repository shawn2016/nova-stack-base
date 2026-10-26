import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import type { Server } from 'node:http';
import { StructuredLogger } from './runtime/structured-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new StructuredLogger(),
  });
  app.enableShutdownHooks();
  await configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;

  const server = app.getHttpServer() as Server;
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 100;
  server.maxRequestsPerSocket = 1000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
