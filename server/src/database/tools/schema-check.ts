import { DataSource } from 'typeorm';

/** Uses TypeORM's read-only metadata diff; does not call synchronize. */
export async function assertSchemaMatches(source: DataSource): Promise<void> {
  const diff = await source.driver.createSchemaBuilder().log();
  if (diff.upQueries.length > 0) {
    throw new Error(`Schema drift detected: ${diff.upQueries.length} schema change(s) required`);
  }
  const runner = source.createQueryRunner();
  try {
    const tables: Array<{ name: string }> = await runner.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    );
    const expected = new Set(source.entityMetadatas.map((metadata) => metadata.tableName));
    const ignored = new Set(['nova_migrations', 'typeorm_metadata']);
    if (tables.some((table) => !expected.has(table.name) && !ignored.has(table.name))) {
      throw new Error('Schema drift detected: unexpected tables');
    }
  } finally {
    await runner.release();
  }
}
