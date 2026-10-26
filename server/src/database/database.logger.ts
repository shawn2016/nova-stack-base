import { Logger as NestLogger } from '@nestjs/common';
import { Logger as TypeOrmLogger } from 'typeorm';

/** Query text and bindings can contain personal data or credentials. Never emit them. */
export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('Database');

  logQuery(): void {
    /* SQL logging is deliberately disabled. */
  }
  logQueryError(_error: string | Error, _query?: string, _parameters?: unknown[]): void {
    this.logger.error('Database query failed');
  }
  logQuerySlow(time: number, _query?: string, _parameters?: unknown[]): void {
    this.logger.warn(`Database query exceeded threshold (${Math.round(time)} ms)`);
  }
  logSchemaBuild(): void {
    /* Migration CLI reports counts only. */
  }
  logMigration(): void {
    /* Migration CLI reports counts only. */
  }
  log(): void {
    /* TypeORM messages may include SQL or parameters. */
  }
}
