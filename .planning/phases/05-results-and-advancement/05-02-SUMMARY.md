---
phase: 05-results-and-advancement
plan: "02"
subsystem: domain/generators + application/launch
tags: [double-elimination, bracket-generator, tdd, launch-tournament]
dependency_graph:
  requires: []
  provides: [generateDoubleEliminationStructure, double_elimination launch support]
  affects: [packages/application/src/tournament/launch-tournament.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, adapter pattern wrapping raw bracket generator]
key_files:
  created:
    - packages/domain/src/tournoi/generators/double-elimination.ts
    - packages/domain/src/tournoi/generators/__tests__/double-elimination-structure.test.ts
  modified:
    - packages/domain/src/tournoi/generators/index.ts
    - packages/application/src/tournament/launch-tournament.ts
decisions:
  - BYE detection based on seedA/seedB null in WB R1 only (mirrors single-elimination pattern)
  - Falls back to single_elimination defaults for sets_to_win/legs_per_set (no dedicated double_elimination defaults yet)
  - idMap.get() guard with continue instead of non-null assertion (Biome compliance)
metrics:
  duration: 3 min
  completed_date: "2026-04-07T20:51:21Z"
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 05 Plan 02: Double Elimination Structure Generator Summary

**One-liner:** TDD adapter `generateDoubleEliminationStructure` wrapping `generateDoubleEliminationBracket` to produce `GeneratorResult` with W/L/GF bracket matches, wired into the tournament launch flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TDD generateDoubleEliminationStructure adapter | 493c4ac | double-elimination.ts, test file, index.ts |
| 2 | Wire double_elimination into launch-tournament.ts | 0036020 | launch-tournament.ts |

## Implementation Details

### Task 1: TDD generateDoubleEliminationStructure adapter

**RED:** Created test file with 11 test cases verifying all structural invariants.

**GREEN:** Implemented `double-elimination.ts` adapter:
- Calls `generateDoubleEliminationBracket(playerCount)` to get raw `BracketMatch[]`
- Builds a UUID `idMap` mapping raw match IDs to new bracket info IDs
- Iterates raw matches, creating `BracketInfoInsertRow` and `MatchInsertRow` for each
- Translates `winnerGoesToMatchId`/`loserGoesToMatchId` references using `idMap`
- BYE detection: WB R1 matches with null seedA or seedB get `status='bye'`
- All team slots are null (filled by `assignTeamsToPhase0`)
- Exported from `generators/index.ts`

### Task 2: Wire into launch flow

- Added `generateDoubleEliminationStructure` to the import from `@darts-management/domain`
- Replaced the `throw new Error("double_elimination phase type not supported yet")` block
- Uses `phase.sets_to_win` and `phase.legs_per_set` with `single_elimination` defaults as fallback

## Deviations from Plan

None — plan executed exactly as written. The only minor adjustment: used `idMap.get() ?? null` pattern with a `continue` guard instead of non-null assertion (`!`) to comply with Biome's `noNonNullAssertion` rule.

## Verification

- 11 new tests pass covering all structural invariants
- All 59 domain tests pass (1 pre-existing skip)
- `pnpm typecheck` exits 0
- `pnpm --filter @darts-management/application lint` clean
- `launch-tournament.ts` no longer throws for `double_elimination`

## Self-Check: PASSED
