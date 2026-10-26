import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { DatabaseLogger } from './database.logger';
import { validate } from '../config/env.validation';
import { AuthSessionEntity, entities } from './entities';
import { AuthSession1792972801000 } from './migrations/1792972801000-AuthSession';
import { InitialSchema1792972800000 } from './migrations/1792972800000-InitialSchema';

/** Shared CLI/seed options. Schema changes are explicit migrations, never bootstrap DDL. */
export function createDatabaseOptions(
  environment: Record<string, unknown> = process.env,
): MysqlConnectionOptions {
  const config = validate(environment);
  return {
    type: 'mysql',
    logger: new DatabaseLogger(),
    host: String(config.DB_HOST ?? 'localhost'),
    port: Number(config.DB_PORT),
    username: String(config.DB_USERNAME ?? 'root'),
    password: String(config.DB_PASSWORD ?? ''),
    database: String(config.DB_DATABASE ?? 'nova_stack'),
    poolSize: Number(config.DB_POOL_SIZE),
    connectTimeout: Number(config.DB_CONNECT_TIMEOUT),
    maxQueryExecutionTime: Number(config.DB_MAX_QUERY_EXECUTION_TIME),
    extra: { waitForConnections: true, queueLimit: 100 },
    entities,
    synchronize: false,
    migrationsRun: false,
    migrations: [InitialSchema1792972800000, AuthSession1792972801000],
    migrationsTableName: 'nova_migrations',
    migrationsTransactionMode: 'none', // MySQL DDL implicitly commits.
  };
}

/** Existing pre-migration installations may mark only the original 29-table schema. */
export function createBaselineOptions(
  environment: Record<string, unknown> = process.env,
): MysqlConnectionOptions {
  return {
    ...createDatabaseOptions(environment),
    entities: entities.filter((entity) => entity !== AuthSessionEntity),
    migrations: [InitialSchema1792972800000],
  };
}
