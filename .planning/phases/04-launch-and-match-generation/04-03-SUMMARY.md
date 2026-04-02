---
phase: 04-launch-and-match-generation
plan: 03
subsystem: api
tags: [postgres, advisory-lock, sql-transaction, tournament-launch, match-generation]

# Dependency graph
requires:
  - phase: 04-01
    provides: MatchInsertRow schema, match table schema, phase table with sets_to_win/legs_per_set
  - phase: 04-02
    provides: snakeDistribute, generateRoundRobinMatches, generateDoubleKoGroupMatches, generateSingleEliminationBracket, assignReferees generators
provides:
  - launch-repository (loadActiveRoster, loadTournamentForLaunch with entity_id JOIN, countEventMatches, insertMatches, deleteMatchesByTournament)
  - launchTournament orchestrator (single transaction: advisory lock + FOR UPDATE + authz + generation + insertion)
  - cancelLaunch service (authz + match deletion + status revert)
  - POST /api/tournament/launch endpoint (403/409/501 error mapping)
  - POST /api/tournament/cancel endpoint (403 error mapping)
affects: [phase-05-results, admin-ui-launch-button]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - createRepository + getLaunchRepositoryWithSql pattern (follows existing db repo convention)
    - pg_advisory_xact_lock(hashtext(event_id)) for concurrent launch prevention
    - SELECT FOR UPDATE on tournament row inside sql.begin() transaction
    - Application service receives userRoles array; internal authz check against entity_id from joined event table

key-files:
  created:
    - packages/db/src/repositories/launch-repository.ts
    - packages/application/src/tournament/launch-tournament.ts
    - packages/application/src/tournament/cancel-launch.ts
    - packages/front/src/routes/api/tournament/launch/+server.ts
    - packages/front/src/routes/api/tournament/cancel/+server.ts
  modified:
    - packages/db/src/index.ts
    - packages/application/src/index.ts
    - packages/front/src/lib/fetch/api.ts

key-decisions:
  - "loadTournamentForLaunch JOINs event table to get entity_id — avoids separate query for authz check"
  - "insertMatches sorts by round_number ascending before insert — finals (round 0) inserted first to satisfy FK on advances_to_match_id"
  - "double_elimination throws explicit error (not silently mapped) — deferred to Phase 5+"
  - "cancelLaunch requires adminComite+ (stricter than launch which allows adminTournoi+)"
  - "ALREADY_LAUNCHED status guard enforces LAUNCH-01 configuration lock at application layer"

patterns-established:
  - "launchTournament: advisory lock pattern: pg_advisory_xact_lock(hashtext(event_id)) then FOR UPDATE on tournament"
  - "API endpoints: getUserRoles passed to application service, service handles authz internally"

requirements-completed: [LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 04 Plan 03: Launch Orchestration Layer Summary

**Transactional tournament launch with advisory lock, all-phases match generation, and atomic cancel — POST /api/tournament/launch + POST /api/tournament/cancel endpoints**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-02T21:24:43Z
- **Completed:** 2026-04-02T21:28:31Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Launch repository with `loadTournamentForLaunch` (JOIN event for entity_id), `loadActiveRoster`, `countEventMatches`, `insertMatches`, `deleteMatchesByTournament`
- `launchTournament` orchestrator: single `sql.begin()` with `pg_advisory_xact_lock`, `SELECT FOR UPDATE`, ALREADY_LAUNCHED guard, round-robin/double-KO/single-elimination generation, referee assignment, status update to 'started'
- `cancelLaunch` service: adminComite+ authz, deletes all matches, reverts status to 'check-in'
- `POST /api/tournament/launch`: 401/400/403/409/501/500 error mapping
- `POST /api/tournament/cancel`: 401/400/403/500 error mapping

## Task Commits

1. **Task 1: Launch repository + launchTournament + cancelLaunch** - `951b5e0` (feat)
2. **Task 2: API endpoints POST /api/tournament/launch and POST /api/tournament/cancel** - `6d14178` (feat)

## Files Created/Modified

- `packages/db/src/repositories/launch-repository.ts` - Repository functions for match DB operations (created)
- `packages/db/src/index.ts` - Added launchRepository and getLaunchRepositoryWithSql exports (modified)
- `packages/application/src/tournament/launch-tournament.ts` - Full launch orchestration in single transaction (created)
- `packages/application/src/tournament/cancel-launch.ts` - Cancel with authz and match deletion (created)
- `packages/application/src/index.ts` - Added launchTournament and cancelLaunch exports (modified)
- `packages/front/src/routes/api/tournament/launch/+server.ts` - POST endpoint with full error mapping (created)
- `packages/front/src/routes/api/tournament/cancel/+server.ts` - POST endpoint with 403 guard (created)
- `packages/front/src/lib/fetch/api.ts` - Added TOURNAMENT_LAUNCH and TOURNAMENT_CANCEL routes (modified)

## Decisions Made

- `insertMatches` sorts by `round_number` ascending before insert so finals (round 0) are inserted first, satisfying the `advances_to_match_id` FK constraint. Leaf-round matches reference parent match IDs which must already exist.
- `cancelLaunch` requires `adminComite+` (stricter than `launchTournament` which accepts `adminTournoi+`) — consistent with CONTEXT.md authority model.
- `double_elimination` throws an explicit error rather than silently falling through — prevents hard-to-debug silent failures when this phase type appears in data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- POST /api/tournament/launch is functional — ready for UI integration in Plan 04-04 or later
- POST /api/tournament/cancel is functional — ready for admin UI cancel button
- `launchTournament` covers round_robin, double_loss_groups, single_elimination — double_elimination guarded for Phase 5
- All typecheck and lint passes (svelte-check: 0 errors)

## Self-Check: PASSED

- launch-repository.ts: FOUND
- launch-tournament.ts: FOUND
- cancel-launch.ts: FOUND
- launch/+server.ts: FOUND
- cancel/+server.ts: FOUND
- Commits 951b5e0 and 6d14178: FOUND

---
*Phase: 04-launch-and-match-generation*
*Completed: 2026-04-02*
