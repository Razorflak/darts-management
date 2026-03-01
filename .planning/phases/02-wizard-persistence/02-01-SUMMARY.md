---
phase: 02-wizard-persistence
plan: 01
subsystem: database
tags: [postgres, sql, node-pg-migrate, typescript, tournament, event]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: entity table (UUID PK), user_entity_role table, Better Auth user IDs (TEXT)
provides:
  - event table with event_status enum, organizer_id, registration_opens_at, entity_id FK
  - tournament table with phases JSONB, auto_referee, club, category, event_id FK (CASCADE)
  - EventData.registrationOpensAt TypeScript field
  - Tournament.autoReferee TypeScript field
  - createTournament() factory with autoReferee: false default
affects:
  - 02-02-server-action
  - 02-03-persistence
  - 02-04-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - raw SQL migration files (no JS wrapper) matching existing 001–005 convention
    - JSONB column for Phase[] serialization (avoids separate phase table)
    - category stored as TEXT (not enum) to match TypeScript union type values

key-files:
  created:
    - packages/db/src/schema/006_event.sql
    - packages/db/src/schema/007_tournament.sql
  modified:
    - packages/front/src/lib/tournament/types.ts
    - packages/front/src/lib/tournament/utils.ts
    - packages/front/src/lib/tournament/components/TemplateModal.svelte

key-decisions:
  - "organizer_id TEXT with no FK constraint — Better Auth manages its own user tables, FK would break"
  - "category stored as TEXT not SQL ENUM — avoids sync drift with TypeScript Category union type"
  - "phases stored as JSONB not separate table — Phase[] is always read/written as a unit, no per-phase queries"
  - "club TEXT nullable, no FK — confirmed free-text field, no entity relationship"
  - "registration_opens_at DATE nullable — NULL means open immediately on publish"

patterns-established:
  - "SQL migration format: raw .sql files, no JS exports wrapper (matching 001–005)"
  - "UUID PKs with gen_random_uuid(), TIMESTAMPTZ timestamps with DEFAULT now()"
  - "Better Auth user IDs referenced as TEXT with no FK constraint"

requirements-completed: [EVENT-01, EVENT-02, EVENT-03, EVENT-06]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 2 Plan 1: Schema Foundation Summary

**PostgreSQL event and tournament tables with event_status enum, JSONB phases, and TypeScript types extended with autoReferee and registrationOpensAt**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-01T14:12:20Z
- **Completed:** 2026-03-01T14:17:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created `006_event.sql` migration with event_status enum, registration_opens_at, organizer_id, and 4 indexes
- Created `007_tournament.sql` migration with auto_referee boolean, phases JSONB, and CASCADE delete from event
- Extended `EventData` with `registrationOpensAt?: string` and `Tournament` with `autoReferee: boolean`
- Updated `createTournament()` factory and `TemplateModal.svelte` to include `autoReferee: false` default

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration — event table (006)** - `102c7bc` (feat)
2. **Task 2: SQL migration — tournament table (007)** - `d362506` (feat)
3. **Task 3: Extend TypeScript types** - `f5bd43f` (feat)

## Files Created/Modified
- `packages/db/src/schema/006_event.sql` - Event table with event_status enum, registration_opens_at, organizer_id, entity_id FK
- `packages/db/src/schema/007_tournament.sql` - Tournament table with phases JSONB, auto_referee, club, event_id FK (CASCADE)
- `packages/front/src/lib/tournament/types.ts` - Added registrationOpensAt to EventData, autoReferee to Tournament
- `packages/front/src/lib/tournament/utils.ts` - Updated createTournament() to include autoReferee: false
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` - Added autoReferee: false to Tournament object construction

## Decisions Made
- `organizer_id` stored as TEXT with no FK constraint — Better Auth manages its own user tables; a FK would cause cross-schema conflicts
- `category` stored as TEXT (not SQL ENUM) — avoids future drift when the TypeScript `Category` union type changes
- `phases` stored as JSONB (not a separate table) — Phase[] is always read/written atomically; no per-phase queries needed
- `club` is TEXT nullable (no FK) — confirmed free-text field per resolved Q2
- `registration_opens_at` is nullable DATE — NULL semantically means "open immediately on publish"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added autoReferee: false to TemplateModal.svelte Tournament construction**
- **Found during:** Task 3 (Extend TypeScript types)
- **Issue:** Plan mentioned checking TemplateModal.svelte — it constructs Tournament objects without autoReferee, which would cause TypeScript errors
- **Fix:** Added `autoReferee: false` to the Tournament object literal in the `apply()` function
- **Files modified:** packages/front/src/lib/tournament/components/TemplateModal.svelte
- **Verification:** pnpm typecheck passes with no errors
- **Committed in:** f5bd43f (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing required field — plan actually anticipated this and said to check TemplateModal)
**Impact on plan:** Required for TypeScript correctness. No scope creep.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. Migrations must be applied to database when ready (handled in a later plan).

## Next Phase Readiness
- Schema foundation complete: event and tournament tables defined and ready to apply via node-pg-migrate
- TypeScript types updated: server-side and client-side code can use autoReferee and registrationOpensAt
- Ready for 02-02: server actions that persist wizard data to these tables

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-01*
