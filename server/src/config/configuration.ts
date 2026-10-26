import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  role: process.env.APP_ROLE ?? (process.env.NODE_ENV === 'production' ? 'api' : 'all'),
  skipExternalServices: process.env.SKIP_EXTERNAL_SERVICES === 'true',
  corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'nova_stack',
  synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNCHRONIZE === 'true',
  poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10000),
  maxQueryExecutionTime: Number(process.env.DB_MAX_QUERY_EXECUTION_TIME ?? 1000),
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  db: Number(process.env.REDIS_DB ?? 0),
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'nova:dev:',
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT ?? 5000),
  commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT ?? 3000),
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '2h',
}));

export const uploadConfig = registerAs('upload', () => ({
  ossEnabled: process.env.OSS_ENABLED === 'true',
  ossRegion: process.env.OSS_REGION ?? 'oss-cn-hangzhou',
  ossBucket: process.env.OSS_BUCKET ?? '',
  ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
  ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
  ossPublicBaseUrl: process.env.OSS_PUBLIC_BASE_URL ?? '',
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:3000',
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE ?? '5242880', 10),
  uploadsDir: process.env.UPLOADS_DIR ?? `${process.cwd()}/uploads`,
}));

export const ipBlacklistConfig = registerAs('ipBlacklist', () => ({
  windowSec: parseInt(process.env.IP_BLACKLIST_WINDOW_SEC ?? '300', 10),
  failThreshold: parseInt(process.env.IP_BLACKLIST_FAIL_THRESHOLD ?? '10', 10),
  banSec: parseInt(process.env.IP_BLACKLIST_BAN_SEC ?? '1800', 10),
  whitelist: (process.env.IP_BLACKLIST_WHITELIST ?? '127.0.0.1,::1')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true',
}));
