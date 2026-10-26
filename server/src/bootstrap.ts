import { BadRequestException, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { RuntimeMiddleware } from './runtime/runtime.middleware';
import { RuntimeSettings } from './runtime/runtime-settings';
import { API_PREFIX } from './common/constants/api-prefix';

/** 配置 Swagger 文档与 CORS（全局管道/拦截器/过滤器由 AppModule APP_* 提供） */
export async function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const corsOrigins = configService
    .get<string>('app.corsOrigins')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ['http://localhost:5173', 'http://localhost:5174'];

  const runtime = app.get(RuntimeMiddleware);
  const settings = app.get(RuntimeSettings);
  app.setGlobalPrefix(API_PREFIX);

  const trustProxy = configService.get<boolean>('ipBlacklist.trustProxy') ?? false;
  if (trustProxy) {
    (app as NestExpressApplication).set('trust proxy', 1);
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(runtime.use.bind(runtime));
  app.use(json({ limit: `${settings.values.bodyLimitKb}kb` }));
  app.use(
    urlencoded({ extended: false, limit: `${settings.values.bodyLimitKb}kb`, parameterLimit: 100 }),
  );

  // Nest 会先将 SyntaxError 映射成 BadRequestException；在此消除 parser 原文。
  app.use((error: unknown, _req: Request, _res: Response, next: NextFunction) => {
    if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
      next(new BadRequestException('Invalid JSON body'));
      return;
    }
    next(error);
  });

  const config = new DocumentBuilder()
    .setTitle('Nova Stack API')
    .setDescription('Nova Stack 后端 API 文档')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
  (app as NestExpressApplication).useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });
}
