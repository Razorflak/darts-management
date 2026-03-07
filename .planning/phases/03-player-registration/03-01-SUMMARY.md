---
phase: 03-player-registration
plan: 01
subsystem: database
tags: [postgres, node-pg-migrate, sql, migrations, player, registration]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    provides: tournament table and event model that tournament_registration references
provides:
  - player table with 8 columns, 3 indexes (including partial UNIQUE on user_id)
  - tournament_registration table with UNIQUE(tournament_id, player_id) and 2 indexes
  - tournament.check_in_required boolean column for Phase 4 check-in enforcement
affects:
  - 03-player-registration (all subsequent plans depend on these tables)
  - 04-bracket-launch (check_in_required drives launch behavior)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "user_id TEXT NULL no FK — same pattern as event.organizer_id; Better Auth manages its own user table"
    - "UNIQUE(tournament_id, player_id) on registration table — deduplication via DB constraint, app catches error 23505"
    - "Partial UNIQUE index WHERE user_id IS NOT NULL — allows multiple NULL user_id (admin-created) profiles"

key-files:
  created:
    - packages/db/src/schema/011_player.sql
    - packages/db/src/schema/012_registration.sql
  modified: []

key-decisions:
  - "player.user_id is TEXT NULL no FK — cross-schema FK with Better Auth user table avoided intentionally, same pattern as organizer_id"
  - "tournament_registration deduplication via UNIQUE(tournament_id, player_id) DB constraint — application catches PostgreSQL error 23505"
  - "Partial UNIQUE index player_user_unique_idx WHERE user_id IS NOT NULL — admin-created profiles (NULL user_id) not subject to uniqueness"
  - "check_in_required DEFAULT false — Phase 4 will enforce, Phase 3 only stores the flag"
  - "player_id FK ON DELETE RESTRICT — prevents deleting a player with existing registrations, protects data integrity"

patterns-established:
  - "Migration files numbered sequentially 0NN_description.sql in packages/db/src/schema/"
  - "player_id references use RESTRICT on delete; tournament_id references use CASCADE"

requirements-completed:
  - PLAYER-01
  - PLAYER-02
  - PLAYER-03
  - PLAYER-04

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 03 Plan 01: Player & Registration DB Migrations Summary

**SQL migrations creating the player profile table (user_id TEXT NULL no FK, partial UNIQUE index) and tournament_registration table (UNIQUE roster constraint, check_in_required flag on tournament)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07T13:45:36Z
- **Completed:** 2026-03-07T13:50:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Migration 011 creates `player` table with 8 columns, index on user_id for fast lookup, composite name index for ILIKE search, and partial UNIQUE index preventing duplicate profiles per user account
- Migration 012 creates `tournament_registration` table with UNIQUE(tournament_id, player_id) pair constraint, ON DELETE RESTRICT for player FK, ON DELETE CASCADE for tournament FK, and two performance indexes
- Migration 012 also adds `check_in_required BOOLEAN NOT NULL DEFAULT false` to `tournament` table for Phase 4 launch behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 011 — table player** - `5b4b277` (feat)
2. **Task 2: Migration 012 — tournament_registration + check_in_required** - `6e909dd` (feat)

## Files Created/Modified

- `packages/db/src/schema/011_player.sql` - Player profile table with user_id TEXT NULL (no FK), name/birth_date/licence_no fields, 3 indexes including partial UNIQUE
- `packages/db/src/schema/012_registration.sql` - tournament_registration table with UNIQUE roster constraint + ALTER TABLE tournament adding check_in_required

## Decisions Made

- `player.user_id` is TEXT NULL with no FK — same pattern as `event.organizer_id`; Better Auth manages its own user table and cross-schema FK avoided intentionally
- Deduplication via DB UNIQUE constraint on `(tournament_id, player_id)` rather than application logic — application catches PostgreSQL error 23505
- Partial UNIQUE index `WHERE user_id IS NOT NULL` allows multiple admin-created player profiles (NULL user_id) while preventing duplicates for actual user accounts
- `player_id` FK uses `ON DELETE RESTRICT` — protects existing registration data if someone tries to delete a player
- `check_in_required DEFAULT false` stored now; enforcement deferred to Phase 4

## Deviations from Plan

Minor deviation: plan used `pnpm migrate up` but correct script is `pnpm db:migrate`. Auto-resolved by checking package.json scripts.

**Total deviations:** 1 (Rule 3 — resolved immediately, not a blocker)
**Impact on plan:** Zero impact — same migration tool, same result.

## Issues Encountered

Migration script name differed from plan (`pnpm migrate up` vs `pnpm db:migrate`). Identified immediately from error output and corrected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `player` and `tournament_registration` tables are in the DB, ready for all 03-0x plans
- `tournament.check_in_required` column in place for Phase 4 launch enforcement
- No blockers for 03-02 onward

---
*Phase: 03-player-registration*
*Completed: 2026-03-07*
