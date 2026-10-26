# Authentication/session production foundation — 2026-10-26

## Result and compatibility

Task 2 implements session-bound access/refresh credentials for administrators and members. Public login/refresh/logout routes and TokenPair response fields stay unchanged. Every login has an independent UUID session; access JWT `jti` and `sid` identify the same stable session, while the refresh JWT has its own `jti`. The access token includes a random nonce so refreshed tokens differ even in the same second. Refresh tokens are reusable until their configured absolute expiry, but cannot authorize access routes; access tokens cannot be exchanged as refresh tokens. No session/refresh authority is created during refresh.

Tokens without validated `purpose` and `sid` are intentionally rejected with a re-login message. All existing clients must log in again after this server change. Existing logical `refresh:admin:{user}`/`refresh:member:{user}` keys are ignored and may expire naturally. The new ordinary logical Redis keys use the globally configured ioredis keyPrefix automatically.

Protected access requires both an unexpired SQL `auth_session` record joined to an enabled current account and a matching Redis session. The SQL check is one indexed primary database query per authenticated request; permissions are separately cached. This intentionally puts current account state/revocation on the primary, with no replica-lag allowance. Redis unavailability has no test/development auth bypass. Logout/kick deletes SQL authority first, then deletes the Redis session, so partial failure between stores cannot restore a revoked token. Administrator freeze/delete revokes every SQL session for that account; unfreeze does not restore old credentials. Refresh checks account status for both administrators and members. Future member freeze/delete mutation implementations must call `JwtService.revokeAccountSessions('member', id)` to prevent restoring unused old sessions after unfreeze.

## Online session metadata

The online API uses SQL metadata, current SQL department membership/data-scope filtering, literal case-insensitive username/IP substring matching, SQL ordering/count/pagination, and no Redis KEYS or full-record scan. Page size is 1–100, page is 1–10000, keyword length is at most 64, and MySQL SELECTs request a 1500 ms maximum execution time. The new indices cover expiry, type/login/id ordering and user/expiry. Kick verifies operator scope as well as permissions. All login paths opportunistically delete at most 100 expired metadata rows using the expiry index; no per-instance process-local index exists. Additional cleanup passes can be an operational job if login traffic cannot keep up with expiry volume.

List/count mean **unexpired session metadata**, not heartbeat/presence or guaranteed current Redis key existence. Normal logout/kick/freeze and data-scope changes are reflected from SQL. Redis key eviction or abnormal loss can leave metadata until SQL absolute expiry; protected authentication still fails closed because it requires both stores. Dedicated noeviction session Redis with persistence and readiness checks is recommended. SQL expiry is copied from the signed refresh JWT's absolute expiry. Failed incomplete admin logins with empty metadata username are excluded from the list.

## Shared cache invalidation

Role status, grants, user-role assignments and user mutations run through `PermissionCacheService.mutate`. All instances use a shared revision and an active-mutation counter. While any mutation is active, readers bypass the permission cache. Completion atomically increments the revision and decrements the counter with Lua, including after a failed/partial SQL operation. A loader rechecks revision/pending state before publishing a cached snapshot. Disabled roles never contribute grants.

Snapshots expire after 60 seconds. A process crash during mutation deliberately leaves a positive pending counter, causing safe SQL fallback indefinitely instead of stale cached grants. Operations may reset the counter only after ensuring no mutation is in flight and bumping the shared revision; automatic reset by timeout would risk stale grants. Direct out-of-band SQL permission edits bypass these mutation hooks and require an explicit revision invalidation or waiting for snapshot expiry.

Normal-IP misses and positive checks are cached in Redis for at most 60 seconds, limited further by a ban's expiry. Every supported ban/status/delete mutation changes that IP's shared revision, so an older concurrent lookup cannot republish a result into the current cache generation. Whitelisted/empty IP behavior stays unchanged.

## Integration/configuration

- `JwtModule` now imports the AuthSession repository and exports `PermissionCacheService` alongside JwtService. RBAC imports JwtModule; no new public endpoints/types were needed.
- `AuthSessionEntity` is exported from the entity registry. Database worker supplied incremental migration `1792972801000-AuthSession.ts`; apply initial baseline/migrations before starting this code against an existing database. No preview schema was changed by this task.
- `JWT_ACCESS_EXPIRES_IN` and `JWT_EXPIRES_IN` configure access and session/refresh TTL. Supported durations are positive integer s/m/h/d values; there is no fixed seven-day Redis TTL.
- Redis must allow GET/SET/DEL/EXISTS/MGET/INCR and EVAL; EVAL must allow INCR/DECR for cache invalidation. RedisService.getClient remains the normal ioredis client with project prefix applied automatically.
- `JwtService.revokeAccountSessions(type,userId)` is the hook for future account disable/delete mutation paths. `PermissionCacheService.mutate` is required for future permission-affecting writes.
- Test helper accepts `createE2eApp({redisClient})` while preserving the existing returned mockRedis field. The shared memory double implements real lazy TTL expiry, NX, MGET, counters, PTTL and known atomic scripts; unsupported scripts fail explicitly.

## Verification

Initial regression run reproduced four failures: refresh JWT accepted as access; second device invalidating first refresh; disabled account refreshing; online listing using KEYS. The IP lookup assertion was refined to spy on the injected repository directly, avoiding middleware exclusions.

Commands were run with Node v24.14.0:

- `pnpm --dir server test 'jwt.service|permission-cache'`: 2 suites / 8 tests passed, including configurable 180-second refresh TTL, legacy rejection, independent session revocation, cross-instance shared permission invalidation and concurrent loader invalidation.
- `pnpm --dir server test:e2e 'auth/|member-auth/|online-session/|rbac/|data-scope/|ip-blacklist/'`: 7 suites / 70 tests passed; optional Redis suite skipped in this ordinary run. Includes role disable/grant removal/user reassignment, freeze/unfreeze old refresh rejection, member multi-device/logout/disabled refresh, negative-IP hit/invalidation, and existing scope flows.
- `FOUNDATION_REDIS_SMOKE=true pnpm --dir server test:e2e foundation-redis.e2e-spec`: 2 tests passed against actual Redis at 127.0.0.1:16389 with a random isolated prefix. Verified independent device refresh, SQL filtered count/page, kick/logout refresh revocation, and atomic invalidation across independent ioredis clients. Uses SQLite test database, not real MySQL; final real MySQL multi-instance acceptance belongs to root integration.
- Scoped `pnpm exec eslint ...`: passed with no output.
- `pnpm --dir server build`: passed.

The real Redis test removes only its unique prefix using bounded SCAN batches and never flushes the database. No production/preview users, real schema, commits, pushes, or worktrees were changed. Observed toolchain warnings: watchman recrawl and Node DEP0169 in dependencies; neither caused test failures.

## Independent review remediation: concurrent mutations

The independent review in `docs/quality/2026-10-26-foundation-auth-review.md` identified P1 stale-login/freeze issuance and P2 concurrent IP status cache publication. Two deterministic gate-controlled regressions were written and run before changes: the login returned 200 instead of 401 after a completed freeze, and final SQL status 1 still produced a cached allow after a delayed status-0 writer completed. Both failed as reported, then passed after the fixes below.

Session issuance now starts a SQL transaction, reads/rechecks the current account through that transaction's manager, takes `SELECT ... FOR UPDATE` on MySQL/MariaDB, and inserts `auth_session` through the same manager while retaining the row lock. SQL status updates/deletion serialize with that lock. If freeze commits first, the issuance recheck rejects it; if insertion holds the lock first, freeze's following session deletion revokes the inserted session. SQLite tests use their supported transaction behavior and omit the unsupported pessimistic-lock clause.

IP mutations now only advance the shared cache revision after their SQL operation. They never populate a cache entry from the mutation's previously captured row. Therefore a delayed earlier writer cannot publish stale allow/ban data after a later SQL writer. The next reader queries current SQL into the new generation. Readers also recheck the revision on cache hits; database lookups retain their originally captured generation so a lookup overlapping a completed write cannot republish into the newer generation. This is revision-based publication isolation, rather than a bare cache-key deletion vulnerable to an in-flight stale lookup.

Additional verification:

- `pnpm --dir server test:e2e 'auth-races.e2e-spec|foundation.e2e-spec'`: 2 suites / 11 tests passed after both regressions initially failed.
- `FOUNDATION_MYSQL_AUTH_SMOKE=true pnpm --dir server test:e2e auth-races-mysql.e2e-spec`: 3 tests passed using the precreated, disposable `nova_foundation_auth_race_test` MySQL schema and real isolated Redis prefix. Verified frozen-account recheck, actual InnoDB row-lock serialization, and the concurrent IP mutation race observed from an independent Redis client.
- The row-lock test pauses issuance immediately before INSERT while its account lock remains held. A competing freeze UPDATE produces the expected `ER_LOCK_WAIT_TIMEOUT` with a one-second session lock timeout; after issuance resumes, a retried freeze UPDATE plus session revocation removes the issued session, and unfreeze does not restore it. The expected timeout intentionally emits a redacted Database query warning/error; assertions pass. No PROCESS or global MySQL inspection privilege is required.
- This optional test clears tables only in a strictly guarded `nova_foundation_auth_race_test` schema (or `TEST_MYSQL_AUTH_DATABASE` matching its guarded prefix), applies migrations for the test and clears those disposable tables afterward. It never drops/creates databases or edits preview accounts. Initial attempt to create a fresh schema with the preview user was denied by least privilege; the test was changed to use the parent-prepared isolated schema and close resources on setup failure.
- JWT/cache unit suite, scoped ESLint and server build were rerun for the change.
