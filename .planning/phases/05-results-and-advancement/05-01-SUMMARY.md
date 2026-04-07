---
phase: 05-results-and-advancement
plan: "01"
subsystem: domain
tags: [scoring, tdd, domain, round-robin]
dependency_graph:
  requires: []
  provides: [SCORING_RULES, validateScore, computeStandings, breakTie, MatchResultPayloadSchema, StandingEntrySchema]
  affects: [05-02, 05-03, 05-04]
tech_stack:
  added: []
  patterns: [zod-first, pure-functions, TDD]
key_files:
  created:
    - packages/domain/src/tournoi/scoring.ts
    - packages/domain/src/tournoi/scoring.test.ts
  modified:
    - packages/domain/src/index.ts
decisions:
  - "validateScore in legs-only mode (sets_to_win=1) uses Math.ceil(legs_per_set/2) as required win count — no ties possible"
  - "computeStandings input type includes walkover field for walkover result resolution"
  - "breakTie uses head-to-head by scanning done/walkover matches after points and leg_diff comparison"
metrics:
  duration: "3 min"
  completed_date: "2026-04-07"
  tasks_completed: 1
  files_changed: 3
requirements: [RESULT-01, RESULT-02]
---

# Phase 05 Plan 01: Scoring Domain Module Summary

**One-liner:** Pure domain scoring module with TDD — validateScore, computeStandings, breakTie, SCORING_RULES per D-06/D-07/D-08/D-09 decisions.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | TDD scoring module — validateScore, SCORING_RULES, computeStandings, breakTie | a59f728 | scoring.ts, scoring.test.ts, index.ts |

## What Was Built

### `packages/domain/src/tournoi/scoring.ts`

Pure functions for match scoring and standings in the domain layer:

- **`SCORING_RULES`**: `{ WIN: 3, LOSS: 0, WALKOVER_WIN: 3, WALKOVER_LOSS: 0, BYE: 0 }` (per D-08)
- **`validateScore(match, result)`**: Validates score payloads against match configuration. In legs-only mode (`sets_to_win=1`), winner must have exactly `Math.ceil(legs_per_set/2)` legs. In sets mode, winner must have exactly `sets_to_win` sets. Walkover payloads always pass without validation.
- **`computeStandings(matches)`**: Builds standings from done/walkover matches. BYE and pending matches are excluded. Returns sorted array by breakTie comparator.
- **`breakTie(a, b, matches)`**: Sorts standings by: 1) points DESC, 2) leg_diff DESC, 3) head-to-head result.
- **`MatchResultPayloadSchema`**: Discriminated union of ScorePayloadSchema | WalkoverPayloadSchema
- **`StandingEntrySchema`**: Zod schema for standing entries

### Test Coverage

21 tests across 4 describe blocks:
- `SCORING_RULES`: 5 tests (constants)
- `validateScore`: 8 tests (BO3 legs, BO5 sets, walkover, edge cases)
- `computeStandings`: 5 tests (full computation, filter pending, walkover, BYE exclusion, sort order)
- `breakTie`: 3 tests (points, leg_diff, head-to-head)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `pnpm --filter @darts-management/domain exec vitest run src/tournoi/scoring.test.ts`: 21/21 passed
- `pnpm typecheck`: exit 0
- `pnpm lint`: exit 0 (warnings in pre-existing files, not in new files)

## Self-Check: PASSED

- [x] `packages/domain/src/tournoi/scoring.ts` exists
- [x] `packages/domain/src/tournoi/scoring.test.ts` exists (21 tests, > 80 lines)
- [x] `packages/domain/src/index.ts` contains `export * from "./tournoi/scoring.js"`
- [x] `SCORING_RULES.WIN === 3`
- [x] Commit a59f728 exists
