import { createDatabaseOptions } from '../../src/database/data-source-options';

// Real integration verification is opt-in and only accepts a disposable database.
describe('migration datasource safety', () => {
  it('never enables synchronize for migration tooling', () => {
    const options = createDatabaseOptions({
      DB_SYNCHRONIZE: 'true',
      DB_DATABASE: 'migration_test',
    });
    expect(options.synchronize).toBe(false);
    expect(options.migrations).toHaveLength(2);
    expect(options.poolSize).toBe(10);
    expect(options.connectTimeout).toBe(10000);
  });
  it('uses explicit connection and query logging budgets', () => {
    const options = createDatabaseOptions({
      DB_POOL_SIZE: '3',
      DB_CONNECT_TIMEOUT: '2000',
      DB_MAX_QUERY_EXECUTION_TIME: '750',
    });
    expect(options).toMatchObject({
      poolSize: 3,
      connectTimeout: 2000,
      maxQueryExecutionTime: 750,
    });
  });
});
