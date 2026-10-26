# Production foundation independent review — 2026-10-26

Scope: current uncommitted production foundation changes, with emphasis on runtime, health, bootstrap, upload configuration, and CI/integration wiring. Earlier lint/client/menu work was treated as baseline. No application source was changed during this review.

## Findings raised and resolved during review

### P1 — Proxy header could bypass the new distributed IP rate limit (resolved)

`server/src/runtime/runtime.middleware.ts:63-67` keys the Redis limiter with `resolveClientIp(req, trustProxy)`. Initially, with `TRUST_PROXY=true`, that helper took the **first** `X-Forwarded-For` value, while `server/src/bootstrap.ts:25-27` configured Express to trust exactly one proxy. If a client supplied its own forwarded prefix and the trusted edge proxy appended the observed client address, the first value was client controlled. Rotating it rotated the rate-limit key and defeated the shared login/API/upload budget. The same helper also fed auth login metadata and IP blacklist checks.

Reproduction using the installed Express and supertest packages: with `app.set('trust proxy', 1)` and `X-Forwarded-For: 198.51.100.99, 203.0.113.44`, Express resolves `req.ip` to `203.0.113.44`, but the prior helper's first-value rule resolved to `198.51.100.99`. The current `server/src/common/utils/resolve-client-ip.ts:3-6` now uses Express's proxy-aware `req.ip`.

### P2 — Production settings could persist an unusable object-store provider (resolved)

Initially, `UploadSettingsService.updateSettings` rejected only `provider: local`, then saved `provider` before credential validation. A production instance running with valid Aliyun settings could accept `{ "provider": "tencent_cos" }` with empty Tencent fields. Subsequent uploads would fail and a restart would fail the startup guard. Current `server/src/modules/upload/upload-settings.service.ts:81-100` validates the merged target configuration before writing within a database transaction; it also rejects an API provider switch when the provider is pinned by environment configuration.

## Verification and limits

- `pnpm lint` passed.
- Targeted Jest run passed after the fixes: `test/upload/production-storage.spec.ts` and `test/runtime/runtime.spec.ts` (7 tests). The upload tests now cover the rejected provider switch and merged-credential validation.
- An attempted local run of `test/runtime/runtime.e2e-spec.ts` failed before tests ran: the installed `better-sqlite3` binary targets Node ABI 137, but this shell uses Node v25.2.1 (ABI 141). The repository requires Node 24. This is a local runtime mismatch, so the five E2E assertions remain unverified in this review.
- `.github/workflows/ci.yml:30-41` supplies DB/Redis/JWT/CORS environment values without requiring `server/.env`; `scripts/run-foundation-integration.mjs:8-10` explicitly enables the real-dependency suites. I did not run a clean CI container or the full real MySQL/Redis integration suite.
- `server/src/worker.ts:8-10` now supplies `StructuredLogger` to the worker Nest application context, resolving the startup logger concern raised during review.

No unresolved P1/P2 finding remained in this assigned scope after the fixes above. The full clean CI and real-dependency outcomes are outside this review's direct verification.

## Follow-up review: built artifact and clean checkout wiring

- `package.json:48-56` extends only the currently locked `@dcloudio/uni-mp-vite` version with `estree-walker@2.0.2`. The installed package's own resolver points to `.pnpm/estree-walker@2.0.2`, and `pnpm-lock.yaml` records the extension checksum and dependency edge. A Node 24 `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts --offline` completed successfully.
- `server/package.json:42` declares Express 5.2.1 directly; normal Node resolution from the server workspace resolves that version, matching the version used by Nest's platform Express package in the lockfile.
- `admin/vite.config.ts:74,84` generates both declaration files under `admin/src/types/import/`, a directory included by `admin/tsconfig.json:26` and excluded from Prettier through `.prettierignore:5`. At review time, both declarations and `.prettierignore` were **untracked** (`??`); they must be included in the eventual submitted change for a clean checkout to receive them. This is a delivery-state check, not a remaining source defect in the current workspace.
- `scripts/run-foundation-integration.mjs:44-48` invokes `scripts/smoke-built-server.mjs` after the real-dependency suites. The smoke starts `server/dist/main.js` with normal Node module resolution, checks readiness, metrics authorization, invalid JSON handling, and SIGTERM shutdown, then removes its isolated Redis key prefix. CI builds before this integration step (`.github/workflows/ci.yml:61-63`). I reviewed the wiring and did not rerun the concurrent full integration suite in this follow-up.
