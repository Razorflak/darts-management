---
phase: 02-wizard-persistence
plan: "02"
subsystem: api
tags: [sveltekit, postgres, server-endpoints, transactions, authz]

# Dependency graph
requires:
  - phase: 02-wizard-persistence/02-01
    provides: event and tournament table schema, TypeScript EventData/Tournament types

provides:
  - GET /events/new page load returning user's organisable entities
  - POST /events/new/save — draft INSERT or UPDATE in a single transaction
  - POST /events/new/publish — full validation + draft save + status='ready' transition

affects:
  - 02-wizard-persistence/02-04 (wizard frontend calls these endpoints)
  - any feature that reads event/tournament rows

# Tech tracking
tech-stack:
  added: [postgres (direct dep in front for TransactionSql types)]
  patterns:
    - "postgres.js TransactionSql cast pattern: rawTx as unknown as postgres.Sql to restore callable type"
    - "Auth guard in +server.ts: error(401) not redirect"
    - "AuthZ check via getUserRoles before every DB write"
    - "sql.begin() transaction wrapping INSERT + tournament replace"

key-files:
  created:
    - packages/front/src/routes/(app)/events/new/+page.server.ts
    - packages/front/src/routes/(app)/events/new/save/+server.ts
    - packages/front/src/routes/(app)/events/new/publish/+server.ts
  modified:
    - packages/front/package.json (added postgres dep)
    - pnpm-lock.yaml

key-decisions:
  - "postgres added as direct front dependency — TransactionSql type needed for tx cast pattern in sql.begin() callbacks"
  - "rawTx cast (as unknown as postgres.Sql) — postgres.js TransactionSql uses Omit<Sql> which strips call signatures in TypeScript; cast is safe, tx is callable at runtime"
  - "eventId narrowed to const before sql.begin() — prevents TypeScript undefined errors inside async callback closures"
  - "authz check via getUserRoles before transaction — avoids wasted DB work if user lacks permission"
  - "Status 'ready' transition inside transaction — atomicity: if tournament inserts fail, event stays draft"

patterns-established:
  - "Server endpoint auth guard: if (!locals.user) return error(401, 'Non authentifié')"
  - "AuthZ check before DB write: getUserRoles + .some() filter against organisableRoles"
  - "sql.begin() cast: await sql.begin(async (rawTx) => { const tx = rawTx as unknown as postgres.Sql })"
  - "Tournament replace pattern: DELETE FROM tournament WHERE event_id + INSERT all"

requirements-completed: [EVENT-01, EVENT-02, EVENT-03, EVENT-05, EVENT-06]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 2 Plan 02: Wizard Persistence Server Endpoints Summary

**Three SvelteKit server files implementing event draft save/publish with postgres transactions, auth guards, and authz checks**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T14:16:02Z
- **Completed:** 2026-03-01T14:22:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Page load for `/events/new` returning entities filtered to user's organisable roles
- Save endpoint supporting idempotent INSERT (no eventId) and UPDATE (eventId provided) in a single sql.begin() transaction
- Publish endpoint with full validation (name, entity, dates, tournament count, categories) before persisting + status transition to 'ready' inside transaction

## Task Commits

Each task was committed atomically:

1. **Task 1: Page server load — entity selector population** - `0b3ebe1` (feat)
2. **Task 2: Save endpoint — draft creation and update** - `d270695` (feat)
3. **Task 3: Publish endpoint — validate + status transition** - `05aba4e` (feat)

## Files Created/Modified

- `packages/front/src/routes/(app)/events/new/+page.server.ts` - Load function; returns `{ entities }` filtered by organisable roles
- `packages/front/src/routes/(app)/events/new/save/+server.ts` - POST handler; INSERT or UPDATE event + tournament replace in transaction; returns `{ ok, eventId }`
- `packages/front/src/routes/(app)/events/new/publish/+server.ts` - POST handler; validates fully, persists, transitions status to 'ready' in transaction
- `packages/front/package.json` - Added `postgres` as direct dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made

- Added `postgres` as a direct dependency of the front package. The `TransactionSql` type from postgres.js uses `Omit<Sql, ...>` which strips call signatures in TypeScript. Direct import allows `rawTx as unknown as postgres.Sql` cast to restore the callable type.
- Narrowed `body.eventId` to a `const eventId` before `sql.begin()` to prevent TypeScript errors about `string | undefined` inside async callbacks.
- Status transition to 'ready' placed inside `sql.begin()` transaction (not after) for atomicity — if any tournament insert fails, event stays as draft.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] postgres.TransactionSql TypeScript type issue**
- **Found during:** Task 2 (save endpoint) and Task 3 (publish endpoint)
- **Issue:** postgres.js `TransactionSql` interface uses `Omit<Sql, ...>` which strips call signatures. TypeScript reports "This expression is not callable" when using tagged template literals on `tx` inside `sql.begin()` callbacks.
- **Fix:** Added `postgres` as a direct front package dependency. Used `rawTx as unknown as postgres.Sql` cast to restore the callable type. This is safe because `TransactionSql` IS callable at runtime — the issue is purely a TypeScript type definition limitation.
- **Files modified:** `packages/front/package.json`, `pnpm-lock.yaml`, both `+server.ts` files
- **Verification:** `pnpm tsc --noEmit` passes with zero errors
- **Committed in:** `d270695` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug in postgres.js type definitions)
**Impact on plan:** Required fix for TypeScript correctness. No scope creep — the cast pattern is a well-known postgres.js workaround.

## Issues Encountered

- TypeScript `TransactionSql` callable issue required adding `postgres` as a direct front dependency and using a type cast. This is a known postgres.js typing limitation where `Omit<Sql, ...>` drops call signatures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three server endpoints are implemented and type-safe
- The wizard frontend (Plan 04) can call `POST /events/new/save` and `POST /events/new/publish` with the documented request shapes
- The page load at `/events/new` returns `{ entities }` ready for the entity selector component
- Auth/authz guards are in place: 401 for unauthenticated, 403 for unauthorized entity

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-01*
