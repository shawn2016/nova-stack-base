# Task 2 authentication and session review — 2026-10-26

Scope: compared the Task 2 implementation with `../.local/nova-preview/foundation-baseline`, read the foundation spec/plan and Task 2 report, and traced JWT, administrator/member login, SQL/Redis session authority, online-session queries, permission invalidation, and IP cache mutations. This was a read-only source review; I did not rerun the reported test suites or modify implementation files.

## Findings

### P1 — A login concurrent with account freeze can create credentials that work after unfreeze

`server/src/modules/auth/auth.service.ts:72-111` checks `user.status` once before password verification and other awaited operations. Freeze in `server/src/modules/rbac/user/user.service.ts:88-100` saves status `0` and deletes the account's *current* SQL sessions. `server/src/common/jwt/jwt.service.ts:36-56` then inserts a new session without locking or rechecking account status.

Reproduction order: pause an otherwise valid admin login after the status check; freeze the account and let session deletion complete; resume login so it inserts the new `auth_session` row and Redis key; unfreeze without making an authenticated request while frozen. The token issued by that login now passes the SQL enabled-account join and Redis check. The temporary frozen state rejects use, but unfreeze restores credentials that the freeze did not revoke, contrary to the stated freeze/unfreeze behavior. The same ordering is possible with account deletion, though the missing account join prevents use unless an ID is reused.

### P2 — Concurrent IP status updates can leave a newer negative cache entry for a banned IP

`server/src/modules/ip-blacklist/ip-blacklist.service.ts:197-210` commits the SQL status before changing Redis. The Redis revision is incremented later in `setRedisBlock`/`clearRedisBlock` at lines 245-259, and `isBlocked` trusts the cached value at lines 49-57.

Reproduction order for an existing IP row: request A saves status `0` and pauses before `clearRedisBlock`; request B reads the disabled row, saves status `1`, and completes `setRedisBlock` (revision N, cached `1`); A resumes and completes `clearRedisBlock` (revision N+1, cached `0`). SQL now says banned, but logins using that IP are allowed from the negative cache for up to 60 seconds. The same ordering can occur between removal and recreation of a ban. The revision protects concurrent *lookups*, but does not serialize competing SQL mutations with their cache publication.

## Other reviewed behavior

Token purpose checks, SQL-first session revocation, per-login session identity, SQL account-status joins, and SQL-scoped bounded session metadata queries match the documented design on the paths reviewed. The online list explicitly represents unexpired SQL metadata, so abnormal Redis key loss leaving a row until SQL expiry is not a finding. The stated real-Redis tests use SQLite; real-MySQL acceptance remains with final integration.

## Re-review after targeted remediation

**Verdict: both findings resolved for the reported race orders.** I reviewed only these fixes and their focused regressions. I did not rerun tests or edit implementation files.

- **P1 resolved.** `JwtService.signRefreshToken` now rechecks account status under a MySQL/MariaDB `FOR UPDATE` lock and inserts `auth_session` through the same transaction manager (`server/src/common/jwt/jwt.service.ts:44-72`). A freeze that commits first causes issuance to reject; issuance that locks first completes before the freeze's status update and subsequent session deletion. The gated stale-login regression is in `server/test/auth/auth-races.e2e-spec.ts:29-64`. The real-MySQL test verifies both status rejection and InnoDB lock serialization at `server/test/auth/auth-races-mysql.e2e-spec.ts:100-157`.
- **P2 resolved.** IP writers now increment only the per-IP Redis revision after their SQL write; they do not publish the saved row's former state (`server/src/modules/ip-blacklist/ip-blacklist.service.ts:186-209,241-247`). A delayed earlier writer can therefore make readers query the final SQL state, but cannot install a newer stale negative entry. A cached hit also checks that its revision remains current (`server/src/modules/ip-blacklist/ip-blacklist.service.ts:49-69`). The gated out-of-order writer regressions are in `server/test/auth/auth-races.e2e-spec.ts:66-100` and the real-MySQL/Redis test at `server/test/auth/auth-races-mysql.e2e-spec.ts:158-204`.

The implementer's report records 11 focused e2e tests, 3 real-MySQL/Redis race tests and 8 JWT/cache unit tests passing. Those reported results support the source-level verdict; this re-review did not independently execute them.
