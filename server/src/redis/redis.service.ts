import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const skipExternal = this.configService.get<boolean>('app.skipExternalServices') ?? false;

    if (skipExternal) {
      this.logger.log('Skipping Redis connection (SKIP_EXTERNAL_SERVICES=true)');
      return;
    }

    this.client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      db: this.configService.get<number>('redis.db', 0),
      keyPrefix: this.configService.get<string>('redis.keyPrefix', 'nova:dev:'),
      username: this.configService.get<string>('redis.username'),
      password: this.configService.get<string>('redis.password'),
      tls: this.configService.get('redis.tls'),
      connectTimeout: this.configService.get<number>('redis.connectTimeout', 5000),
      commandTimeout: this.configService.get<number>('redis.commandTimeout', 3000),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', () => this.logger.error('Redis connection unavailable'));
    try {
      await this.client.connect();
    } catch {
      // Keep the client for automatic reconnects; readiness observes its status.
      this.logger.error('Redis initial connection failed');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      if (this.client.status === 'ready') {
        try {
          await this.client.quit();
        } finally {
          this.client.disconnect();
        }
      } else {
        this.client.disconnect();
      }
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}
