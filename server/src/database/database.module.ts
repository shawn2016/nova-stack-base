import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseLogger } from './database.logger';
import { entities } from './entities';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const skipExternal = process.env.SKIP_EXTERNAL_SERVICES === 'true';

    if (skipExternal) {
      return { module: DatabaseModule };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'mysql' as const,
            logger: new DatabaseLogger(),
            host: configService.get<string>('database.host'),
            port: configService.get<number>('database.port'),
            username: configService.get<string>('database.username'),
            password: configService.get<string>('database.password'),
            database: configService.get<string>('database.database'),
            // entities 显式注册全部实体；autoLoadEntities 供后续 forFeature 模块增量加载（二者并存无害）
            entities,
            autoLoadEntities: true,
            synchronize: configService.get<boolean>('database.synchronize', false),
            poolSize: configService.get<number>('database.poolSize', 10),
            connectTimeout: configService.get<number>('database.connectTimeout', 10000),
            maxQueryExecutionTime: configService.get<number>(
              'database.maxQueryExecutionTime',
              1000,
            ),
            extra: { waitForConnections: true, queueLimit: 100 },
            retryAttempts: 3,
            retryDelay: 1000,
          }),
        }),
      ],
    };
  }
}
