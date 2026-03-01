---
phase: quick-1
plan: 1
subsystem: db, front/server
tags: [architecture, database, auth, env-vars, sveltekit]
dependency_graph:
  requires: []
  provides: [createSql factory, createAuth factory, sql singleton, auth singleton]
  affects: [packages/db, packages/front/src/lib/server]
tech_stack:
  added: []
  patterns: [factory-function pattern for env-aware initialization, $env/static/private for SvelteKit server env vars]
key_files:
  created:
    - packages/front/src/lib/server/db.ts
  modified:
    - packages/db/src/client.ts
    - packages/db/src/auth.ts
    - packages/db/src/index.ts
    - packages/front/src/lib/server/auth.ts
    - packages/front/src/routes/(app)/admin/+page.server.ts
    - packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
decisions:
  - createAuth accepts {secret, baseURL, smtp} config object instead of flat SmtpConfig
  - adminRoles uses camelCase key "adminFederal" matching the roles object key (not snake_case)
  - BETTER_AUTH_SECRET and BETTER_AUTH_URL passed via $env/static/private (not process.env)
metrics:
  duration: 7 min
  completed: 2026-03-01
---

# Quick Task 1: Fix DATABASE_URL Architecture — sql/auth Factory Functions Summary

**One-liner:** Converted packages/db singletons to factory functions (createSql/createAuth) and created $env/static/private-initialized singletons in packages/front/src/lib/server/, eliminating the build-time DATABASE_URL crash.

## What Was Built

packages/db now exports pure factory functions with no process.env reads. packages/front/src/lib/server/ holds the two initialization singletons that source all env vars from SvelteKit's $env/static/private. All server route imports updated.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Convert packages/db to factory functions | 8dfb587 | packages/db/src/client.ts, auth.ts, index.ts |
| 2 | Create front server singletons and update all imports | 7a4ba6a | packages/front/src/lib/server/db.ts (new), auth.ts, 2 route files |

## Key Files

**packages/db/src/client.ts** — `createSql(databaseUrl: string): postgres.Sql`

**packages/db/src/auth.ts** — `createAuth(sql: postgres.Sql, config: AuthConfig)` where AuthConfig = `{smtp, secret, baseURL?}`

**packages/front/src/lib/server/db.ts** — Sole initialization point for `sql`, imports `DATABASE_URL` from `$env/static/private`

**packages/front/src/lib/server/auth.ts** — Sole initialization point for `auth`, imports all required env vars from `$env/static/private`

## Decisions Made

- `createAuth` signature changed from `(sql, smtp)` to `(sql, config)` to also accept `secret` and `baseURL` — required because Better Auth validates secret at instantiation time during build
- `adminRoles: ["adminFederal"]` — fixed from `"admin_federal"` which caused a BetterAuthError at build time; the roles object key is camelCase
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` sourced via `$env/static/private` and passed explicitly to `createAuth`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Removed explicit ReturnType<typeof betterAuth> annotation**
- **Found during:** Task 1 verification (svelte-check)
- **Issue:** `ReturnType<typeof betterAuth>` stripped the inferred generic type including admin plugin extensions, causing `userHasPermission` to not exist on the auth API type
- **Fix:** Removed explicit return type annotation, letting TypeScript infer the full type
- **Files modified:** packages/db/src/auth.ts
- **Commit:** 7a4ba6a

**2. [Rule 1 - Bug] Fixed adminRoles snake_case mismatch**
- **Found during:** Task 2 build
- **Issue:** `adminRoles: ["admin_federal"]` did not match the roles object key `adminFederal`, causing BetterAuthError at build time
- **Fix:** Changed to `adminRoles: ["adminFederal"]`
- **Files modified:** packages/db/src/auth.ts
- **Commit:** 7a4ba6a

**3. [Rule 2 - Missing critical config] Added BETTER_AUTH_SECRET and BETTER_AUTH_URL to createAuth config**
- **Found during:** Task 2 build
- **Issue:** Better Auth validates secret at instantiation time; without it, build fails with BetterAuthError. Previously hidden because DATABASE_URL guard threw first
- **Fix:** Extended AuthConfig type to include `secret` and optional `baseURL`; auth.ts imports both from $env/static/private
- **Files modified:** packages/db/src/auth.ts, packages/front/src/lib/server/auth.ts
- **Commit:** 7a4ba6a

**4. [Rule 2 - Missing env vars] Added SMTP_USER, SMTP_PASS, BETTER_AUTH_SECRET, BETTER_AUTH_URL to .env**
- **Found during:** Task 2 svelte-check / build
- **Issue:** $env/static/private only exports vars present in .env; named imports for missing vars cause type errors
- **Fix:** Added empty SMTP_USER=, SMTP_PASS= and values for BETTER_AUTH_SECRET/BETTER_AUTH_URL to both .env files (gitignored, not committed)

## Verification Results

1. No process.env in packages/db: CLEAN
2. No @darts-management/db imports in packages/front/src/routes/: CLEAN
3. pnpm check (svelte-check): 0 errors, 0 warnings
4. pnpm build: success

## Self-Check: PASSED

- packages/front/src/lib/server/db.ts: EXISTS
- packages/front/src/lib/server/auth.ts: EXISTS (updated)
- packages/db/src/client.ts: EXISTS (factory)
- packages/db/src/auth.ts: EXISTS (factory)
- Commit 8dfb587: EXISTS
- Commit 7a4ba6a: EXISTS
