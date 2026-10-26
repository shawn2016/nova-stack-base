import { redactLog } from '../../src/runtime/structured-logger';
import { readRuntimeSettings } from '../../src/runtime/runtime-settings';

describe('runtime configuration and redaction', () => {
  it('redacts nested credentials and bounded text', () => {
    const value = JSON.stringify(redactLog({ authorization: 'Bearer abc', nested: { password: 'private', token: 'raw' }, url: 'mysql://root:pass@db', message: 'Bearer top-secret' }));
    for (const secret of ['abc', 'private', 'raw', 'root:pass', 'top-secret']) expect(value).not.toContain(secret);
  });
  it('rejects invalid settings and production bypass', () => {
    expect(() => readRuntimeSettings({ RATE_LIMIT_MAX: 'NaN' })).toThrow('RATE_LIMIT_MAX');
    expect(() => readRuntimeSettings({ NODE_ENV: 'production', RATE_LIMIT_ENABLED: 'false' })).toThrow('cannot be disabled');
    expect(() => readRuntimeSettings({ METRICS_TOKEN: 'short' })).toThrow('METRICS_TOKEN');
    expect(() => readRuntimeSettings({ METRICS_TOKEN: ' '.repeat(32) })).toThrow('METRICS_TOKEN');
    expect(() => readRuntimeSettings({ TRUST_PROXY: '1' })).toThrow('TRUST_PROXY');
    expect(readRuntimeSettings({ NODE_ENV: 'test' }).rateLimitEnabled).toBe(false);
  });
});
