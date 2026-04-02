---
phase: 04-launch-and-match-generation
plan: "01"
subsystem: database
tags: [postgres, sql, migration, zod, domain]

# Dependency graph
requires:
  - phase: 03-player-registration
    provides: team table (team_id FK referenced by match)
  - phase: 02-wizard-persistence
    provides: phase table (phase_id FK referenced by match and phase_tier)
provides:
  - migration 016: phase_tier table, match table, tournament/phase columns
  - MatchInsertRowSchema, MatchRowSchema, MatchStatusSchema in @darts-management/domain
  - PhaseTierSchema in @darts-management/domain
affects:
  - 04-02-match-generator
  - 04-03-launch-endpoint
  - 04-04-match-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migration pattern: ALTER TABLE before CREATE TABLE for dependency order"
    - "Zod MatchInsertRowSchema without created_at/score for generator use; MatchRowSchema extends with DB-only fields"

key-files:
  created:
    - packages/db/src/schema/016_phase_tier_and_match.sql
    - packages/domain/src/tournoi/match-schemas.ts
  modified:
    - packages/domain/src/tournoi/phase-schemas.ts
    - packages/domain/src/index.ts

key-decisions:
  - "advances_to_slot TEXT ('a'|'b') — separate column from advances_to_match_id to identify which slot winner fills in next match"
  - "phase.tiers JSONB NOT dropped — wizard still uses it, plan 04 will migrate"
  - "MatchInsertRowSchema has no score_a/b or created_at — generators produce blank matches; full MatchRowSchema adds those"

patterns-established:
  - "Match generator pattern: MatchInsertRow used by pure generator functions, persisted via SQL UNNEST bulk insert"

requirements-completed: [LAUNCH-02, LAUNCH-03, LAUNCH-04]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 4 Plan 01: Match Schema Foundation Summary

**PostgreSQL migration 016 + Zod domain types establishing the match table (with event_match_id, advances_to_slot, referee_team_id), phase_tier table, and tournament seeding columns used by all Phase 4 plans**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T21:06:00Z
- **Completed:** 2026-04-02T21:11:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created migration 016 with phase_tier table, match table (15 columns), and ALTER TABLE statements for tournament.is_seeded, tournament.seed_order, phase.sets_to_win, phase.legs_per_set
- Created MatchInsertRowSchema (for match generators) and MatchRowSchema (for DB reads) in packages/domain
- Added PhaseTierSchema to phase-schemas.ts
- Exported match-schemas from domain barrel; typecheck and lint pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 016** - `28e0c62` (feat)
2. **Task 2: Create Zod match schemas + update domain barrel** - `d8cc3fa` (feat)

**Plan metadata:** (forthcoming docs commit)

## Files Created/Modified

- `packages/db/src/schema/016_phase_tier_and_match.sql` - Migration: phase_tier + match tables, tournament/phase column additions
- `packages/domain/src/tournoi/match-schemas.ts` - MatchStatusSchema, MatchInsertRowSchema, MatchRowSchema
- `packages/domain/src/tournoi/phase-schemas.ts` - Added PhaseTierSchema at end of file
- `packages/domain/src/index.ts` - Added export for match-schemas.js

## Decisions Made

- `advances_to_slot TEXT` ('a' or 'b') as separate column alongside `advances_to_match_id` — Phase 5 needs to know which slot (team_a or team_b) to fill when placing the winner
- `phase.tiers JSONB` not dropped — wizard still uses it; migration will happen in plan 04-04
- Two schemas: `MatchInsertRowSchema` (no score, no created_at) for generators to produce; `MatchRowSchema` extends it with DB-only fields for reading

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome import sort order in domain barrel**
- **Found during:** Task 2 (lint check)
- **Issue:** `match-schemas.js` was placed after `schemas.js` in index.ts — Biome organizeImports requires alphabetical order so `match-schemas` must precede `schemas`
- **Fix:** Reordered exports in index.ts to match alphabetical order
- **Files modified:** packages/domain/src/index.ts
- **Verification:** `biome check .` passes with no errors
- **Committed in:** d8cc3fa (Task 2 commit)

**2. [Rule 1 - Bug] Biome formatting: MatchStatusSchema enum on single line**
- **Found during:** Task 2 (lint check)
- **Issue:** Biome formatter requires enum values on separate lines when line length exceeds limit
- **Fix:** Reformatted `z.enum([...])` to multi-line with trailing comma
- **Files modified:** packages/domain/src/tournoi/match-schemas.ts
- **Verification:** `biome check .` passes with no errors
- **Committed in:** d8cc3fa (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - formatting/lint)
**Impact on plan:** Both auto-fixes are Biome compliance corrections with no semantic impact. No scope creep.

## Issues Encountered

None — lint issues were immediately discovered and fixed before commit.

## User Setup Required

None - no external service configuration required.

The migration 016 SQL file will be applied when the developer runs the migration tool against their local database. No special setup needed beyond the standard migration command.

## Next Phase Readiness

- Match table schema defined — plan 04-02 (match generators) can now implement pure TypeScript generation functions that produce MatchInsertRow objects
- Phase_tier table defined — plan 04-04 (wizard migration) can migrate tiers JSONB to normalized rows
- Tournament seeding columns ready — plan 04-03 (launch endpoint) can use is_seeded + seed_order
- All Phase 4 plans have their foundation; no blockers

---
*Phase: 04-launch-and-match-generation*
*Completed: 2026-04-02*
