---
phase: 01-foundation
plan: "01"
subsystem: database
tags: [better-auth, postgres, kysely, node-pg-migrate, nodemailer, permissions, rbac]

# Dependency graph
requires: []
provides:
  - "packages/db exports auth (Better Auth server instance) and sql (postgres.js connection)"
  - "Four role definitions: joueur, organisateur, adminTournoi, adminFederal with access control"
  - "SQL migration files for Better Auth tables (001) and entity hierarchy (002)"
  - "Dev seed script for federation, ligues, comites, clubs, and 4 test users (003)"
  - "node-pg-migrate configured as migration runner via pnpm db:migrate"
affects:
  - 01-02
  - 01-03
  - 01-04
  - all subsequent phases that import auth or sql from packages/db

# Tech tracking
tech-stack:
  added:
    - "better-auth ^1.4.20 — auth server (session, email/password, admin plugin)"
    - "kysely-postgres-js ^3.0.0 — bridge allowing Better Auth to use postgres.js dialect"
    - "nodemailer ^8.0.1 — SMTP email for password reset flow"
    - "node-pg-migrate ^8.0.4 — raw SQL migration runner replacing prisma migrate scripts"
    - "@types/nodemailer ^7.0.11 — TypeScript types for nodemailer"
  patterns:
    - "Better Auth server configured with kysely-postgres-js to share existing postgres.js connection (no dual-driver)"
    - "sveltekitCookies(getRequestEvent) must be last plugin in Better Auth plugins array"
    - "Better Auth tables use camelCase columns (no casing: snake -- bug #4789)"
    - "App tables (entity) use snake_case columns"
    - "sendResetPassword uses void mailer.sendMail(...) -- no await to prevent timing attacks"
    - "defaultRole: joueur ensures new users get correct role at registration"

key-files:
  created:
    - "packages/db/src/permissions.ts"
    - "packages/db/src/auth.ts"
    - "packages/db/src/schema/001_auth.sql"
    - "packages/db/src/schema/002_entities.sql"
    - "packages/db/src/schema/003_seed_dev.sql"
    - "packages/db/src/sveltekit.d.ts"
    - "packages/db/.env.example"
  modified:
    - "packages/db/src/index.ts"
    - "packages/db/package.json"

key-decisions:
  - "kysely-postgres-js dialect used to share postgres.js connection with Better Auth (avoids dual-driver setup)"
  - "node-pg-migrate replaces prisma migrate scripts (cleaner for no-ORM project; prisma kept as devDep)"
  - "Better Auth tables use camelCase columns to avoid known bug with postgres.js dialect (issue #4789)"
  - "requireEmailVerification: false — immediate login after registration (locked product decision)"
  - "defaultRole: joueur in admin plugin — all new users start as joueur"
  - "sveltekitCookies plugin placed last in plugins array — required for SvelteKit form actions to set cookies"
  - "$app/server virtual module declared in sveltekit.d.ts within packages/db for TypeScript resolution"

patterns-established:
  - "Pattern: Better Auth server in packages/db/src/auth.ts, imported by packages/front server-side code only"
  - "Pattern: Roles defined in packages/db/src/permissions.ts using createAccessControl from better-auth/plugins/access"
  - "Pattern: Migration files in packages/db/src/schema/ with numeric prefix ordering (001_, 002_)"
  - "Pattern: .env.example documents required environment variables alongside actual .env (gitignored)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, ORG-01, ORG-02]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 1 Plan 01: DB Foundation Summary

**Better Auth v1.4 server with kysely-postgres-js dialect, 4 RBAC roles, raw SQL migrations for auth tables and entity hierarchy, and node-pg-migrate runner**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T19:18:44Z
- **Completed:** 2026-02-28T19:20:30Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- packages/db now exports both `sql` (postgres.js connection) and `auth` (Better Auth server) for use by all subsequent plans
- Four role definitions (joueur, organisateur, adminTournoi, adminFederal) established with fine-grained access control statements covering entity, event, tournament, and user_role resources
- SQL migration files ready: Better Auth managed tables with camelCase columns (001), entity adjacency list hierarchy with federation constraint (002), dev seed with full organizational hierarchy and 4 test users (003)
- Migration runner switched from prisma to node-pg-migrate; `pnpm db:migrate` now runs plain SQL files

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and replace migration runner** - `12bbae0` (chore)
2. **Task 2: Write SQL migrations and dev seed** - `a1af69d` (feat)
3. **Task 3: Create permissions.ts and auth.ts, update db index** - `0fbc73a` (feat)

## Files Created/Modified

- `packages/db/src/permissions.ts` - Four role definitions (joueur, organisateur, adminTournoi, adminFederal) with createAccessControl
- `packages/db/src/auth.ts` - Better Auth server instance: kysely-postgres-js dialect, admin plugin, sveltekitCookies last
- `packages/db/src/schema/001_auth.sql` - Better Auth tables (user, session, account, verification) with camelCase columns
- `packages/db/src/schema/002_entities.sql` - Entity hierarchy table with adjacency list and federation-no-parent constraint
- `packages/db/src/schema/003_seed_dev.sql` - Dev seed: FFD federation, 2 ligues, 4 comites, 3 clubs, 4 test users
- `packages/db/src/sveltekit.d.ts` - Type declaration for $app/server virtual module (TypeScript resolution in packages/db)
- `packages/db/src/index.ts` - Updated to export both sql and auth
- `packages/db/package.json` - Updated scripts (node-pg-migrate) and dependencies
- `packages/db/.env.example` - Documents DATABASE_URL and SMTP_ environment variables

## Decisions Made

- Used kysely-postgres-js instead of adding the `pg` package — allows Better Auth to share the existing postgres.js connection, avoiding a dual-driver setup to the same database
- Replaced prisma migrate scripts with node-pg-migrate — cleaner fit for a no-ORM project running raw SQL; prisma kept as devDep to avoid removing an existing tool
- Better Auth tables keep camelCase columns to avoid the known bug in kysely-postgres-js where `casing: "snake"` does not propagate correctly (GitHub issue #4789), causing runtime SQL column-not-found errors
- Added `sveltekit.d.ts` in packages/db to declare the `$app/server` virtual module — allows TypeScript to resolve the import without needing SvelteKit's Vite plugin at typecheck time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added sveltekit.d.ts for $app/server module declaration**

- **Found during:** Task 3 (Create permissions.ts and auth.ts)
- **Issue:** The plan noted TypeScript may complain about `$app/server` not resolvable from packages/db, and suggested either a path mapping or declare module. Without it, typecheck would fail, blocking the done criterion.
- **Fix:** Created `packages/db/src/sveltekit.d.ts` with `declare module "$app/server"` providing the `getRequestEvent` function signature.
- **Files modified:** `packages/db/src/sveltekit.d.ts`
- **Verification:** `pnpm --filter @darts-management/db typecheck` passes with no errors.
- **Committed in:** `0fbc73a` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — plan anticipated this, fix was the suggested approach)
**Impact on plan:** Required for typecheck to pass. No scope creep.

## Issues Encountered

None — all three tasks executed cleanly. The `$app/server` declaration was anticipated by the plan and resolved as suggested.

## User Setup Required

Before running migrations, copy `.env.example` to `.env` in `packages/db` and set:

- `DATABASE_URL` — PostgreSQL connection string (e.g., `postgres://postgres:postgres@localhost:5432/darts_dev`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM` — SMTP configuration for password reset emails

Run migrations: `pnpm --filter @darts-management/db db:migrate`

For dev seed (optional, run manually): `psql $DATABASE_URL -f packages/db/src/schema/003_seed_dev.sql`

## Next Phase Readiness

- `packages/db` is ready to be imported by `packages/front` — both `auth` and `sql` are exported
- Phase 01-02 (SvelteKit hooks and session wiring) can now proceed — it depends on `auth` from packages/db
- Database must be running and migrated before starting any SvelteKit development server

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

All claimed files exist and all task commits verified:
- FOUND: packages/db/src/permissions.ts
- FOUND: packages/db/src/auth.ts
- FOUND: packages/db/src/index.ts
- FOUND: packages/db/src/schema/001_auth.sql
- FOUND: packages/db/src/schema/002_entities.sql
- FOUND: packages/db/src/schema/003_seed_dev.sql
- FOUND: packages/db/src/sveltekit.d.ts
- FOUND: packages/db/.env.example
- FOUND: .planning/phases/01-foundation/01-01-SUMMARY.md
- COMMIT 12bbae0: chore(01-01): install Better Auth deps and replace migration runner
- COMMIT a1af69d: feat(01-01): write SQL migrations and dev seed
- COMMIT 0fbc73a: feat(01-01): create permissions.ts, auth.ts and update db index
