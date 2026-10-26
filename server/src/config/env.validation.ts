/** Validate before opening any external connection. Errors name keys, never values. */
export function validate(
  config: Record<string, unknown>,
): Record<string, unknown> & { APP_ROLE: string; JWT_SECRET: string } {
  const result = { ...config };
  const text = (key: string, fallback = ''): string => {
    const value = result[key] ?? fallback;
    if (typeof value !== 'string') throw new Error(`${key} must be a string`);
    result[key] = value;
    return value;
  };
  const integer = (key: string, fallback: number, min: number, max: number): void => {
    const value = result[key] ?? fallback;
    if (
      !/^[0-9]+$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) < min ||
      Number(value) > max
    ) {
      throw new Error(`${key} must be an integer between ${min} and ${max}`);
    }
    result[key] = Number(value);
  };
  const boolean = (key: string): string => {
    const value = text(key, 'false');
    if (value !== 'true' && value !== 'false') throw new Error(`${key} must be true or false`);
    return value;
  };
  const nodeEnv = text('NODE_ENV', 'development');
  if (!['development', 'production', 'test'].includes(nodeEnv))
    throw new Error('NODE_ENV is invalid');
  const production = nodeEnv === 'production';
  const role = text('APP_ROLE', production ? 'api' : 'all');
  if (!['api', 'worker', 'all'].includes(role) || (production && role === 'all'))
    throw new Error('APP_ROLE must be api or worker in production');
  const jwt = text('JWT_SECRET', 'change-me-in-production');
  if (
    production &&
    (jwt.trim().length < 32 || /change[-_ ]?me|example|replace[-_ ]?me/i.test(jwt))
  ) {
    throw new Error('JWT_SECRET must be a strong secret of at least 32 characters in production');
  }
  integer('PORT', 3000, 1, 65535);
  integer('DB_PORT', 3306, 1, 65535);
  integer('REDIS_PORT', 6379, 1, 65535);
  integer('DB_POOL_SIZE', 10, 1, 100);
  integer('DB_CONNECT_TIMEOUT', 10000, 1, 120000);
  integer('DB_MAX_QUERY_EXECUTION_TIME', 1000, 1, 120000);
  integer('REDIS_DB', 0, 0, 15);
  integer('REDIS_CONNECT_TIMEOUT', 5000, 1, 120000);
  integer('REDIS_COMMAND_TIMEOUT', 3000, 1, 120000);
  boolean('REDIS_TLS');
  if (boolean('DB_SYNCHRONIZE') === 'true' && production)
    throw new Error('DB_SYNCHRONIZE must be false in production');
  if (boolean('SKIP_EXTERNAL_SERVICES') === 'true' && production)
    throw new Error('SKIP_EXTERNAL_SERVICES is forbidden in production');
  if (production) {
    for (const key of [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'REDIS_HOST',
      'REDIS_KEY_PREFIX',
      'CORS_ORIGINS',
    ]) {
      if (!text(key).trim()) throw new Error(`${key} must be explicitly configured in production`);
    }
    if (text('DB_USERNAME').toLowerCase() === 'root')
      throw new Error('DB_USERNAME must be a dedicated application user in production');
    if (text('DB_DATABASE') === 'nova_stack')
      throw new Error('DB_DATABASE must be a dedicated project database in production');
    if (/^(change[-_ ]?me|password|root|example)$/i.test(text('DB_PASSWORD')))
      throw new Error('DB_PASSWORD must not use a template password in production');
    const prefix = text('REDIS_KEY_PREFIX');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*:$/.test(prefix) || prefix === 'nova:dev:')
      throw new Error('REDIS_KEY_PREFIX must be a dedicated namespace ending in :');
    for (const origin of text('CORS_ORIGINS').split(',')) {
      try {
        const url = new URL(origin.trim());
        if (
          url.protocol !== 'https:' ||
          url.origin !== origin.trim() ||
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        )
          throw new Error();
      } catch {
        throw new Error('CORS_ORIGINS must contain explicit HTTPS origins in production');
      }
    }
  }
  return result as Record<string, unknown> & { APP_ROLE: string; JWT_SECRET: string };
}
