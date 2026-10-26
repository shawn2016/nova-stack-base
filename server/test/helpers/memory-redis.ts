/** Redis test double: lazy expiry and atomic synchronous script bodies. */
export function createMemoryRedis() {
  const store = new Map<string, string>();
  const expiry = new Map<string, number>();
  const read = (key: string): string | null => {
    if ((expiry.get(key) ?? Infinity) <= Date.now()) {
      store.delete(key);
      expiry.delete(key);
    }
    return store.get(key) ?? null;
  };
  const increment = (key: string, by = 1): number => {
    const next = Number(read(key) ?? 0) + by;
    store.set(key, String(next));
    return next;
  };
  return {
    set: jest.fn(async (key: string, value: string, ...options: (string | number)[]) => {
      if (options.includes('NX') && read(key) !== null) return null;
      store.set(key, value);
      expiry.delete(key);
      const ex = options.indexOf('EX');
      const px = options.indexOf('PX');
      if (ex >= 0) expiry.set(key, Date.now() + Number(options[ex + 1]) * 1000);
      if (px >= 0) expiry.set(key, Date.now() + Number(options[px + 1]));
      return 'OK';
    }),
    get: jest.fn(async (key: string) => read(key)),
    mget: jest.fn(async (...keys: string[]) => keys.map(read)),
    exists: jest.fn(async (key: string) => (read(key) === null ? 0 : 1)),
    del: jest.fn(async (...keys: string[]) =>
      keys.reduce((n, key) => {
        const present = read(key) !== null;
        store.delete(key);
        expiry.delete(key);
        return n + Number(present);
      }, 0),
    ),
    incr: jest.fn(async (key: string) => increment(key)),
    decr: jest.fn(async (key: string) => increment(key, -1)),
    expire: jest.fn(async (key: string, seconds: number) => {
      if (read(key) === null) return 0;
      expiry.set(key, Date.now() + seconds * 1000);
      return 1;
    }),
    pttl: jest.fn(async (key: string) =>
      read(key) === null ? -2 : expiry.has(key) ? Math.max(0, expiry.get(key)! - Date.now()) : -1,
    ),
    ttl: jest.fn(async (key: string) =>
      read(key) === null
        ? -2
        : expiry.has(key)
          ? Math.ceil((expiry.get(key)! - Date.now()) / 1000)
          : -1,
    ),
    ping: jest.fn(async () => 'PONG'),
    eval: jest.fn(async (script: string, count: number, ...args: (string | number)[]) => {
      const keys = args.slice(0, count).map(String);
      const argv = args.slice(count).map(String);
      if (script.includes('nova-authz-finish')) {
        increment(keys[0]);
        return increment(keys[1], -1);
      }
      if (script.includes('INCR') && script.includes('PEXPIRE')) {
        const value = increment(keys[0]);
        if (value === 1) expiry.set(keys[0], Date.now() + Number(argv[0]));
        return [value, expiry.get(keys[0])! - Date.now()];
      }
      throw new Error('Unsupported Redis script in memory double');
    }),
    keys: jest.fn(async (pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      return [...store.keys()].filter((key) => read(key) !== null && key.startsWith(prefix));
    }),
    _store: store,
    _expiry: expiry,
  };
}
