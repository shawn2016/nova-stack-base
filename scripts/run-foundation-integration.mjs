import { spawnSync } from 'node:child_process';

const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const run = (args, env) => {
  const result = spawnSync(
    executable,
    ['--filter', '@nova/server', 'exec', 'jest', ...args, '--runInBand'],
    { stdio: 'inherit', env: { ...process.env, ...env } },
  );
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
};
run(
  [
    '--config',
    'test/jest-unit.json',
    'test/database/migration.integration.spec.ts',
    'test/config/redis.integration.spec.ts',
  ],
  { TEST_MIGRATION_DATABASE: 'nova_foundation_migration_test', TEST_REAL_REDIS: 'true' },
);
run(
  [
    '--config',
    'test/jest-e2e.json',
    'test/auth/foundation-redis.e2e-spec.ts',
    'test/auth/auth-races-mysql.e2e-spec.ts',
  ],
  {
    FOUNDATION_REDIS_SMOKE: 'true',
    FOUNDATION_MYSQL_AUTH_SMOKE: 'true',
    TEST_MYSQL_AUTH_DATABASE: 'nova_foundation_auth_race_test',
  },
);
run(
  [
    '--config',
    'test/jest-integration.json',
    'test/runtime/foundation-real.integration-spec.ts',
    'test/job/job-runtime.integration-spec.ts',
  ],
  { FOUNDATION_MYSQL_SMOKE: 'true', JOB_QUEUE_REDIS_TEST: 'true' },
);

const built = spawnSync(process.execPath, ['scripts/smoke-built-server.mjs'], {
  stdio: 'inherit',
  env: process.env,
});
if (built.error || built.status !== 0) process.exit(built.status ?? 1);
