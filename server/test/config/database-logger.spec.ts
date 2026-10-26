import { Logger } from '@nestjs/common';
import { DatabaseLogger } from '../../src/database/database.logger';

describe('database diagnostic redaction', () => {
  it('reports slow/error queries without SQL, bindings or driver messages', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      const logger = new DatabaseLogger();
      logger.logQueryError('password=secret', 'INSERT credential secret', ['private-value']);
      logger.logQuerySlow(2000, 'INSERT credential secret', ['private-value']);
      expect(error.mock.calls).toEqual([['Database query failed']]);
      expect(warn.mock.calls).toEqual([['Database query exceeded threshold (2000 ms)']]);
    } finally {
      error.mockRestore();
      warn.mockRestore();
    }
  });
});
