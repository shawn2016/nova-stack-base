import { validate } from '../../src/config/env.validation';

const production = {
  DB_HOST: 'mysql',
  DB_USERNAME: 'nova_app',
  DB_PASSWORD: 'secure-password',
  DB_DATABASE: 'nova_production',
  REDIS_HOST: 'redis',
  REDIS_KEY_PREFIX: 'nova:production:',
  CORS_ORIGINS: 'https://admin.example.com',
};

describe('env.validation JWT production fail-fast', () => {
  it('production 环境下弱 JWT_SECRET 在 bootstrap 时抛出', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        JWT_SECRET: 'change-me-in-production',
      }),
    ).toThrow(/JWT_SECRET/i);
  });

  it('production 环境下空 JWT_SECRET 在 bootstrap 时抛出', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        JWT_SECRET: '',
      }),
    ).toThrow(/JWT_SECRET/i);
  });

  it('production 环境下短 JWT_SECRET 在 bootstrap 时抛出', () => {
    expect(() =>
      validate({
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow(/JWT_SECRET/i);
  });

  it('production 环境下强 JWT_SECRET 通过校验', () => {
    const config = validate({
      ...production,
      NODE_ENV: 'production',
      JWT_SECRET: 'a-very-strong-production-secret-key-32chars',
    });

    expect(config.JWT_SECRET).toBe('a-very-strong-production-secret-key-32chars');
  });

  it('development 环境下允许默认弱 JWT_SECRET', () => {
    const config = validate({
      NODE_ENV: 'development',
      JWT_SECRET: 'change-me-in-production',
    });

    expect(config.JWT_SECRET).toBe('change-me-in-production');
  });
});
