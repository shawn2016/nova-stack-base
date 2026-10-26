import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';
import {
  createBaselineOptions,
  createDatabaseOptions,
} from '../../src/database/data-source-options';
import { assertSchemaMatches } from '../../src/database/tools/schema-check';

const database = process.env.TEST_MIGRATION_DATABASE;
const integration = database ? describe : describe.skip;

integration('real MySQL migration lifecycle (disposable database only)', () => {
  let source: DataSource;
  beforeAll(async () => {
    if (!database?.startsWith('nova_foundation_migration_test'))
      throw new Error('Refusing non-disposable test database');
    config({ path: resolve(__dirname, '../../.env') });
    source = new DataSource(createDatabaseOptions({ ...process.env, DB_DATABASE: database }));
    await source.initialize();
    await source.dropDatabase();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });
  it('detects an empty schema, migrates, reverts and reapplies without synchronization', async () => {
    await expect(assertSchemaMatches(source)).rejects.toThrow('drift');
    expect(await source.runMigrations({ transaction: 'none' })).toHaveLength(2);
    await expect(assertSchemaMatches(source)).resolves.toBeUndefined();
    await source.undoLastMigration({ transaction: 'none' });
    await source.undoLastMigration({ transaction: 'none' });
    const tables: Array<{ name: string }> = await source.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    expect(tables.map((table) => table.name)).toEqual(['nova_migrations']);
    expect(await source.runMigrations({ transaction: 'none' })).toHaveLength(2);
    await expect(assertSchemaMatches(source)).resolves.toBeUndefined();
  });
  it('detects schema drift before fake baseline and preserves existing rows', async () => {
    await source.query(
      "INSERT INTO sys_config (`config_key`, `config_value`, `config_name`) VALUES ('migration:sentinel', 'preserve', 'migration sentinel')",
    );
    await source.undoLastMigration({ transaction: 'none' });
    await source.query('DROP TABLE nova_migrations');
    const baseline = new DataSource(
      createBaselineOptions({ ...process.env, DB_DATABASE: database }),
    );
    await baseline.initialize();
    try {
      await source.query('ALTER TABLE sys_config ADD COLUMN drift_marker int NULL');
      await expect(assertSchemaMatches(baseline)).rejects.toThrow('drift');
      const runner = source.createQueryRunner();
      try {
        expect(await runner.hasTable('nova_migrations')).toBe(false);
      } finally {
        await runner.release();
      }
      await source.query('ALTER TABLE sys_config DROP COLUMN drift_marker');
      await assertSchemaMatches(baseline);
      expect(await baseline.runMigrations({ fake: true, transaction: 'none' })).toHaveLength(0);
      const records: Array<{ name: string }> = await source.query(
        'SELECT name FROM nova_migrations',
      );
      expect(records).toEqual([{ name: 'InitialSchema1792972800000' }]);
      expect(await source.runMigrations({ transaction: 'none' })).toHaveLength(1);
      const rows: Array<{ config_value: string }> = await source.query(
        "SELECT config_value FROM sys_config WHERE `config_key`='migration:sentinel'",
      );
      expect(rows).toEqual([{ config_value: 'preserve' }]);
      expect(await source.showMigrations()).toBe(false);
    } finally {
      await baseline.destroy();
    }
  });
  it('CLI refuses an already-populated or unrecognized migration ledger', async () => {
    await source.undoLastMigration({ transaction: 'none' });
    for (const name of ['InitialSchema1792972800000', 'UnknownMigration1792972800000']) {
      await source.query('UPDATE nova_migrations SET name = ?', [name]);
      const result = spawnSync(
        process.execPath,
        ['-r', 'ts-node/register', 'src/database/tools/migrate.ts', 'baseline'],
        {
          cwd: resolve(__dirname, '../..'),
          env: { ...process.env, DB_DATABASE: database },
          encoding: 'utf8',
        },
      );
      expect(result.status).toBe(1);
      const rows: Array<{ name: string }> = await source.query('SELECT name FROM nova_migrations');
      expect(rows).toEqual([{ name }]);
    }
  });
});
