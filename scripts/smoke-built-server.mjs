import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Validate the built artifact with normal Node resolution, not Jest's resolver.
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const prefix = `nova:built-smoke:${randomUUID()}:`;
const metricsToken = randomUUID();
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: fileURLToPath(new URL('../server/', import.meta.url)),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    APP_ROLE: 'api',
    PORT: String(port),
    DB_DATABASE: 'nova_foundation_runtime_test',
    DB_SYNCHRONIZE: 'false',
    SKIP_EXTERNAL_SERVICES: 'false',
    REDIS_KEY_PREFIX: prefix,
    RATE_LIMIT_ENABLED: 'true',
    METRICS_TOKEN: metricsToken,
  },
  stdio: ['ignore', 'ignore', 'ignore'],
});
let exited = false;
const exitedPromise = new Promise((resolve) =>
  child.once('exit', (code, signal) => {
    exited = true;
    resolve({ code, signal });
  }),
);
const origin = `http://127.0.0.1:${port}`;
const get = (path, init) =>
  fetch(`${origin}${path}`, { ...init, signal: AbortSignal.timeout(3000) });
try {
  let ready = false;
  for (let i = 0; i < 60 && !exited; i++) {
    try {
      ready = (await get('/api/health/ready')).status === 200;
    } catch {
      /* startup */
    }
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error('Built API did not become ready');
  if ((await get('/api/health/metrics')).status !== 401)
    throw new Error('Built metrics authentication failed');
  if (
    (await get('/api/health/metrics', { headers: { Authorization: `Bearer ${metricsToken}` } }))
      .status !== 200
  )
    throw new Error('Built metrics unavailable');
  const invalid = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{secret-data',
  });
  if (invalid.status !== 400 || (await invalid.json()).message !== 'Invalid JSON body')
    throw new Error('Built parser boundary failed');
  console.log('[built-smoke] readiness, protected metrics and parser boundary passed');
} finally {
  child.kill('SIGTERM');
  let shutdownTimer;
  const result = await Promise.race([
    exitedPromise,
    new Promise((resolve) => {
      shutdownTimer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(null);
      }, 10000);
    }),
  ]);
  clearTimeout(shutdownTimer);
  if (!result || result.signal !== 'SIGTERM') throw new Error('Built API graceful shutdown failed');
  console.log('[built-smoke] SIGTERM shutdown passed');
  const requireServer = createRequire(new URL('../server/package.json', import.meta.url));
  const envFile = fileURLToPath(new URL('../server/.env', import.meta.url));
  const local = existsSync(envFile) ? requireServer('dotenv').parse(readFileSync(envFile)) : {};
  const env = { ...local, ...process.env };
  const Redis = requireServer('ioredis');
  const redis = new Redis({
    host: env.REDIS_HOST ?? '127.0.0.1',
    port: Number(env.REDIS_PORT ?? 6379),
    db: Number(env.REDIS_DB ?? 0),
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    tls: env.REDIS_TLS === 'true' ? {} : undefined,
    connectTimeout: 2000,
    commandTimeout: 2000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redis.on('error', () => undefined);
  try {
    await redis.connect();
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } finally {
    redis.disconnect();
  }
}
