import configuredSource from '../data-source';
import { DataSource, MigrationExecutor } from 'typeorm';
import { createBaselineOptions } from '../data-source-options';
import { assertSchemaMatches } from './schema-check';

/** CLI never logs connection options, secrets or SQL parameter values. */
async function main(): Promise<void> {
  const command = process.argv[2];
  if (!['run', 'revert', 'check', 'baseline'].includes(command)) {
    throw new Error('Usage: migrate.ts run|revert|check|baseline');
  }
  const source =
    command === 'baseline' ? new DataSource(createBaselineOptions()) : configuredSource;
  await source.initialize();
  try {
    if (command === 'check') {
      await assertSchemaMatches(source);
      console.log('[migration] schema matches registered entities');
    } else if (command === 'baseline') {
      // Drift is checked BEFORE TypeORM is allowed to create migration tracking.
      await assertSchemaMatches(source);
      const executed = await new MigrationExecutor(source).getExecutedMigrations();
      if (executed.length > 0) {
        throw new Error('Baseline requires an absent or empty migration ledger');
      }
      const pending = await source.showMigrations();
      if (pending) await source.runMigrations({ fake: true, transaction: 'none' });
      console.log('[migration] verified baseline recorded; application data preserved');
    } else if (command === 'run') {
      const applied = await source.runMigrations({ transaction: 'none' });
      console.log(`[migration] applied ${applied.length} migration(s)`);
    } else {
      // An initial down migration drops tables. Require deliberate operator intent.
      if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_REVERT !== 'true')
        throw new Error(
          'Revert may delete data; set ALLOW_DESTRUCTIVE_MIGRATION_REVERT=true after backup',
        );
      await source.undoLastMigration({ transaction: 'none' });
      console.log('[migration] reverted latest migration');
    }
  } finally {
    await source.destroy();
  }
}

void main().catch(() => {
  // Driver messages may contain connection credentials or SQL data.
  console.error(
    '[migration] failed; verify configuration, connectivity, schema drift and explicit revert authorization',
  );
  process.exitCode = 1;
});
