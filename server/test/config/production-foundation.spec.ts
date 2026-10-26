import { validate } from '../../src/config/env.validation';
import appConfig, { databaseConfig, redisConfig } from '../../src/config/configuration';

const production = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a-distinct-strong-production-secret-1234567890',
  DB_HOST: 'mysql',
  DB_USERNAME: 'nova_app',
  DB_PASSWORD: 'secure-password',
  DB_DATABASE: 'nova_production',
  REDIS_HOST: 'redis',
  REDIS_KEY_PREFIX: 'nova:production:',
  CORS_ORIGINS: 'https://admin.example.com',
};

describe('production connection boundaries', () => {
  it.each(['PORT', 'DB_PORT', 'REDIS_PORT'])('rejects invalid %s', (name) => {
    for (const value of ['0', '65536', '12x', '1.5', '']) {
      expect(() => validate({ ...production, [name]: value })).toThrow(name);
    }
  });
  it.each([
    'DB_POOL_SIZE',
    'DB_CONNECT_TIMEOUT',
    'DB_MAX_QUERY_EXECUTION_TIME',
    'REDIS_CONNECT_TIMEOUT',
    'REDIS_COMMAND_TIMEOUT',
  ])('rejects unbounded %s', (name) => {
    expect(() => validate({ ...production, [name]: '0' })).toThrow(name);
  });
  it.each([
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'REDIS_HOST',
    'REDIS_KEY_PREFIX',
    'CORS_ORIGINS',
  ])('requires explicit production %s', (name) => {
    expect(() => validate({ ...production, [name]: undefined })).toThrow(name);
  });
  it.each([
    { DB_DATABASE: 'nova_stack' },
    { DB_USERNAME: 'root' },
    { DB_SYNCHRONIZE: 'true' },
    { SKIP_EXTERNAL_SERVICES: 'true' },
    { CORS_ORIGINS: '*' },
    { CORS_ORIGINS: 'http://localhost:5173' },
    { REDIS_KEY_PREFIX: '' },
    { APP_ROLE: 'all' },
    { REDIS_TLS: 'yes' },
    { REDIS_DB: '-1' },
  ])('rejects unsafe production setting %o', (setting) => {
    expect(() => validate({ ...production, ...setting })).toThrow();
  });
  it.each([' '.repeat(32), '\t\n'.repeat(32)])('rejects whitespace-only JWT_SECRET', (secret) => {
    expect(() => validate({ ...production, JWT_SECRET: secret })).toThrow('JWT_SECRET');
  });
  it('defaults production to api and permits explicit worker', () => {
    expect(validate(production).APP_ROLE).toBe('api');
    expect(validate({ ...production, APP_ROLE: 'worker' }).APP_ROLE).toBe('worker');
  });
  it('retains unknown configuration needed by other modules', () => {
    expect(validate({ ...production, UPLOAD_PROVIDER: 'aliyun' })).toHaveProperty(
      'UPLOAD_PROVIDER',
      'aliyun',
    );
  });
});

describe('configuration factories', () => {
  const original = process.env;
  beforeEach(() => {
    process.env = {};
  });
  afterEach(() => {
    process.env = original;
  });
  it('disables implicit schema synchronization and exposes connection budgets', () => {
    expect(databaseConfig()).toMatchObject({
      synchronize: false,
      poolSize: 10,
      connectTimeout: 10000,
      maxQueryExecutionTime: 1000,
    });
    expect(appConfig()).toHaveProperty('role', 'all');
  });
  it('exposes Redis isolation and bounded commands', () => {
    process.env.REDIS_KEY_PREFIX = 'test:one:';
    process.env.REDIS_DB = '2';
    process.env.REDIS_TLS = 'true';
    expect(redisConfig()).toMatchObject({
      db: 2,
      keyPrefix: 'test:one:',
      tls: {},
      connectTimeout: 5000,
      commandTimeout: 3000,
    });
  });
});
