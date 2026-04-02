---
phase: 04-launch-and-match-generation
plan: 02
subsystem: domain
tags: [vitest, zod, typescript, tdd, tournament, bracket, round-robin, snake-seeding]

# Dependency graph
requires:
  - phase: 04-launch-and-match-generation
    plan: 01
    provides: MatchInsertRowSchema and MatchInsertRow type that generators must produce

provides:
  - snakeDistribute: zigzag group distribution with remainder to last group
  - bergerRounds + generateRoundRobinMatches: Berger circle-method round-robin schedule
  - generateDoubleKoGroupMatches: R1/R2Upper/R2Lower/R3 bracket with advances_to wiring
  - getBracket + generateSingleEliminationBracket: seeded bracket with BYE and tier config
  - assignReferees: greedy least-assigned referee assignment per match slot
  - All 5 generators exported from @darts-management/domain barrel

affects:
  - 04-03: Orchestration layer that calls these generators inside the launch transaction
  - 04-04: Match display pages consume MatchInsertRow structure
  - 05-xx: Phase 5 uses advances_to_match_id wiring for result propagation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD red-green cycle: test files first, implementation until green"
    - "Pure generator functions: (teams[], config) => MatchInsertRow[] — no DB dependency"
    - "Pre-generate all match UUIDs in TypeScript before any insert (avoids FK ordering issues)"
    - "Berger circle-method rotation for round-robin: fixed team + rotating array"
    - "Level-by-level bracket tree construction: level 0 = final, level N-1 = first round"

key-files:
  created:
    - packages/domain/src/tournoi/generators/snake-seeding.ts
    - packages/domain/src/tournoi/generators/round-robin.ts
    - packages/domain/src/tournoi/generators/double-ko-group.ts
    - packages/domain/src/tournoi/generators/single-elimination.ts
    - packages/domain/src/tournoi/generators/referee-assignment.ts
    - packages/domain/src/tournoi/generators/index.ts
    - packages/domain/src/tournoi/generators/__tests__/snake-seeding.test.ts
    - packages/domain/src/tournoi/generators/__tests__/round-robin.test.ts
    - packages/domain/src/tournoi/generators/__tests__/double-ko-group.test.ts
    - packages/domain/src/tournoi/generators/__tests__/single-elimination.test.ts
    - packages/domain/src/tournoi/generators/__tests__/referee-assignment.test.ts
  modified:
    - packages/domain/src/index.ts

key-decisions:
  - "snakeDistribute uses floor(N/groupCount)*groupCount snake passes, then remainder appended to last group — matches CONTEXT.md rule"
  - "getBracket produces [seedA, seedB] pairs in algorithm order (not necessarily sorted) — tests use hasPair helper for unordered comparison"
  - "generateSingleEliminationBracket: level 0 = final (round_number=0), level N-1 = first round (highest round_number) — advances_to_match_id flows from child to parent"
  - "Double-KO advances_to_match_id encodes only winner path; loser routing to R2Lower is implicit bracket structure (Phase 5 resolves)"
  - "assignReferees per-slot exclusion key is round_number:group_number — prevents same team refereeing two matches in same round"

patterns-established:
  - "Generator signature: (group/teams, groupNumber/phaseId, startEventMatchId, config) => MatchInsertRow[]"
  - "BYE matches: status='bye', one team_a_id or team_b_id is null"
  - "advances_to_slot enum 'a'|'b' identifies which slot the winner fills in the next match"

requirements-completed: [LAUNCH-02, LAUNCH-04, LAUNCH-05]

# Metrics
duration: 9min
completed: 2026-04-02
---

# Phase 4 Plan 02: Match Generation Algorithms Summary

**Five pure TypeScript match generators (snake seeding, round-robin Berger, double-KO group, single elimination, referee assignment) fully TDD-implemented and exported from @darts-management/domain**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-02T21:08:54Z
- **Completed:** 2026-04-02T21:17:59Z
- **Tasks:** 3 (TDD tasks)
- **Files modified:** 12

## Accomplishments

- 5 generator modules in `packages/domain/src/tournoi/generators/` — all pure functions with no DB dependency
- 5 test files with 44 tests covering snake seeding, round-robin schedules, double-KO wiring, single elimination brackets, and referee assignment edge cases
- All generators produce `MatchInsertRow`-compatible objects ready for batch SQL insertion
- Domain barrel updated — all generators accessible via `@darts-management/domain`

## Task Commits

Each task was committed atomically (TDD: RED then GREEN combined in one commit):

1. **Task 1: Snake seeding + Round-robin generator** - `6f99805` (feat)
2. **Task 2: Double-KO group + Single elimination** - `8ffa374` (feat)
3. **Task 3: Referee assignment + barrels** - `9d405a2` (feat)

## Files Created/Modified

- `packages/domain/src/tournoi/generators/snake-seeding.ts` - `snakeDistribute(teams, groupCount, playersPerGroup)`: zigzag distribution with remainder to last group
- `packages/domain/src/tournoi/generators/round-robin.ts` - `bergerRounds()` Berger circle-method + `generateRoundRobinMatches()` with sequential event_match_id
- `packages/domain/src/tournoi/generators/double-ko-group.ts` - `generateDoubleKoGroupMatches()` for power-of-2 groups: R1/R2U/R2L/R3 with advances_to wiring
- `packages/domain/src/tournoi/generators/single-elimination.ts` - `getBracket()` seeding algo from CONTEXT.md + `generateSingleEliminationBracket()` with BYE detection and per-tier config
- `packages/domain/src/tournoi/generators/referee-assignment.ts` - `assignReferees()`: greedy least-assigned with per-slot exclusion
- `packages/domain/src/tournoi/generators/index.ts` - Barrel re-exporting all 5 generators
- `packages/domain/src/tournoi/generators/__tests__/snake-seeding.test.ts` - 6 test cases
- `packages/domain/src/tournoi/generators/__tests__/round-robin.test.ts` - 11 test cases
- `packages/domain/src/tournoi/generators/__tests__/double-ko-group.test.ts` - 11 test cases
- `packages/domain/src/tournoi/generators/__tests__/single-elimination.test.ts` - 12 test cases
- `packages/domain/src/tournoi/generators/__tests__/referee-assignment.test.ts` - 5 test cases
- `packages/domain/src/index.ts` - Added `export * from "./tournoi/generators/index.js"`

## Decisions Made

- **getBracket unordered pairs:** The CONTEXT.md algorithm produces pairs as `[seedA, seedB]` where `seedA` may be larger than `seedB` (e.g., `[3,2]` instead of `[2,3]`). Tests use a `hasPair(result, x, y)` helper that checks both orderings, not `toContainEqual([2,3])`.
- **Single elimination round numbering:** `round_number=0` is the final, `round_number=N-1` is the first round (first-round matches have highest round number). This follows the "distance from final" convention and matches the `tiers[0]=final` configuration from the plan.
- **Double-KO advances_to encodes winner path only:** The schema has one `advances_to_match_id` per match. For double-KO, this points to the winner's next match. Loser routing (R1→R2Lower, R2Upper loser→R3) is structural knowledge used by Phase 5 result processing.
- **Snake seeding remainder logic:** `snakeCount = floor(N/groupCount)*groupCount` ensures complete snake passes; remaining teams append to last group per CONTEXT.md rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getBracket test pair ordering**
- **Found during:** Task 2 (single-elimination TDD — GREEN phase)
- **Issue:** Test used `toContainEqual([2,3])` but algorithm produces `[3,2]` — semantically equivalent pairs but test failed
- **Fix:** Added `hasPair(result, x, y)` helper that checks `[x,y]` or `[y,x]`
- **Files modified:** `packages/domain/src/tournoi/generators/__tests__/single-elimination.test.ts`
- **Committed in:** `8ffa374` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed greedy referee test scenario**
- **Found during:** Task 3 (referee-assignment TDD — GREEN phase)
- **Issue:** Original test had both matches in round 0, so T3/T4/T5/T6 were all eligible for both (not just T5/T6), making the assertion `referees.has("T5") || referees.has("T6")` unreliable
- **Fix:** Rewrote test with matches in different rounds so the greedy assignment of different referees is observable
- **Files modified:** `packages/domain/src/tournoi/generators/__tests__/referee-assignment.test.ts`
- **Committed in:** `9d405a2` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test specification bugs)
**Impact on plan:** Both fixes corrected test assumptions, not implementation. Core algorithms are correct as designed.

## Issues Encountered

- Snake seeding algorithm required 2 iterations to get the navigation logic right (boundary reversal direction). Final implementation uses `floor(N/groupCount)*groupCount` complete snake passes then appends remainder.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 generators are pure functions ready to be called by the Plan 03 orchestration layer
- `MatchInsertRow[]` output is immediately insertable via `sql(match)` in a `sql.begin()` transaction
- `advances_to_match_id` foreign key ordering constraint: insert parent matches before child matches (final before semis before QF) — Plan 03 must handle this ordering

---
*Phase: 04-launch-and-match-generation*
*Completed: 2026-04-02*
