import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { MemberUserEntity } from '../../src/database/entities';
import { runInitSeed } from '../../src/database/seeds/init.seed';
import { RedisService } from '../../src/redis/redis.service';
import { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { initE2eSchema } from './e2e-schema';

import { createMemoryRedis } from '../helpers/memory-redis';

export type MockRedis = ReturnType<typeof createMemoryRedis>;

export interface E2eAppContext {
  app: INestApplication;
  mockRedis: MockRedis;
  dataSource: DataSource;
}

/** 使用 sqlite 内存库 + Mock Redis 启动完整 Nest 应用（e2e 专用） */
export async function createE2eApp(options: { redisClient?: Redis } = {}): Promise<E2eAppContext> {
  process.env.NODE_ENV = 'test';
  process.env.SKIP_EXTERNAL_SERVICES = 'true';
  process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.JWT_ACCESS_EXPIRES_IN = '2h';
  process.env.PORT = '0';
  process.env.OSS_ENABLED = 'false';
  process.env.APP_PUBLIC_URL = 'http://localhost:3000';
  process.env.UPLOAD_MAX_SIZE = '5242880';
  process.env.IP_BLACKLIST_WHITELIST = '';
  process.env.IP_BLACKLIST_FAIL_THRESHOLD = '3';
  process.env.TRUST_PROXY = 'true';

  const mockRedis = createMemoryRedis();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        autoLoadEntities: true,
        synchronize: false,
      }),
      TypeOrmModule.forFeature([MemberUserEntity]),
      AppModule,
    ],
  })
    .overrideProvider(RedisService)
    .useValue({
      getClient: () => options.redisClient ?? mockRedis,
    })
    .compile();

  const app = moduleFixture.createNestApplication({ bodyParser: false });
  await configureApp(app);
  await app.init();

  const dataSource = moduleFixture.get(DataSource);
  await initE2eSchema(dataSource);
  await runInitSeed(dataSource);

  return { app, mockRedis, dataSource };
}
