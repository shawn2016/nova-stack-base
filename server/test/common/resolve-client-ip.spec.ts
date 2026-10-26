import type { Request } from 'express';
import { resolveClientIp } from '../../src/common/utils/resolve-client-ip';

function mockReq(partial: Partial<Request>): Request {
  return partial as Request;
}

describe('resolveClientIp', () => {
  it('uses req.ip when trustProxy is false', () => {
    const req = mockReq({ ip: '10.0.0.5', headers: {} });
    expect(resolveClientIp(req, false)).toBe('10.0.0.5');
  });

  it('uses Express trusted-hop IP instead of the untrusted XFF prefix', () => {
    const req = mockReq({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.50, 10.0.0.1' },
    });
    expect(resolveClientIp(req, true)).toBe('10.0.0.1');
  });

  it('falls back to socket remoteAddress', () => {
    const req = mockReq({
      headers: {},
      socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    });
    expect(resolveClientIp(req, false)).toBe('127.0.0.1');
  });
});

// Express trusts exactly the directly connected ingress; earlier XFF entries are client controlled.
import express from 'express';
import request from 'supertest';
it('keeps the same client identity when an attacker varies XFF before ingress append', async () => {
  const app = express(); app.set('trust proxy', 1);
  app.get('/', (req, res) => res.json({ ip: resolveClientIp(req, true) }));
  const a = await request(app).get('/').set('X-Forwarded-For', '198.51.100.1, 203.0.113.50');
  const b = await request(app).get('/').set('X-Forwarded-For', '198.51.100.2, 203.0.113.50');
  expect(a.body.ip).toBe('203.0.113.50'); expect(b.body.ip).toBe(a.body.ip);
});
