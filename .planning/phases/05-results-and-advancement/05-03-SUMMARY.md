---
phase: 05-results-and-advancement
plan: "03"
subsystem: match-result-submission
tags: [match-repository, submit-match-result, bracket-advancement, phase-completion]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [match-repository, submit-match-result]
  affects: [packages/db, packages/application]
tech_stack:
  added: []
  patterns: [createRepository, getRepositoryWithSql, sql.begin transaction, FOR UPDATE lock, pg_advisory_xact_lock]
key_files:
  created:
    - packages/db/src/repositories/match-repository.ts
    - packages/application/src/tournament/submit-match-result.ts
  modified:
    - packages/db/src/index.ts
    - packages/application/src/index.ts
decisions:
  - "walkover 'a' means team_a forfeited, so team_b wins — consistent with scoring.ts convention"
  - "GF reset check: team_b is LB winner per double_elimination generator convention"
  - "seedNextPhase distinguishes bracket vs round-robin by checking first-round seed presence"
  - "Phase completion triggers seeding only when total > 0 AND total === finished"
metrics:
  duration: "4 min"
  completed_date: "2026-04-07"
  tasks: 2
  files: 4
---

# Phase 05 Plan 03: Match Repository and Submit Match Result Summary

Atomic transaction layer for match result submission: validates scores, persists results, advances winner/loser in bracket, and triggers next phase seeding when all matches in a phase are complete.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create match-repository.ts | f80b8db | packages/db/src/repositories/match-repository.ts, packages/db/src/index.ts |
| 2 | Create submit-match-result.ts + wire exports | 5a5c223 | packages/application/src/tournament/submit-match-result.ts, packages/application/src/index.ts |

## What Was Built

### match-repository.ts (10 functions)

- **lockMatchForUpdate** — SELECT ... FOR UPDATE prevents double-submission race conditions
- **updateMatchResult** — Persists score_a, score_b, status ('done'|'walkover')
- **advanceWinnerInBracket** — CTE-based UPDATE fills winner's slot in next bracket match
- **advanceLoserInBracket** — Same pattern for loser slot in double-elimination LB
- **checkPhaseComplete** — Counts total vs done/walkover/bye matches
- **getPhaseQualifiers** — Groups round-robin matches, computes standings via domain computeStandings, interleaves results
- **seedNextPhase** — Finds position+1 phase, assigns teams by seed (bracket) or slot (round-robin)
- **getMatchBracketInfo** — Returns bracket type and winner_goes_to for GF reset detection
- **createResetMatch** — pg_advisory_xact_lock + dynamic GF reset match creation with proper team wiring
- **lookupMatchByEventMatchId** — Full match view with player name aggregation for hub tile display

### submit-match-result.ts

Single atomic `sql.begin()` transaction:
1. Lock match with FOR UPDATE
2. Authz via phase → tournament → event chain
3. validateScore from domain (throws ScoreInvalid: on bad scores)
4. Determine winner/loser from score or walkover payload
5. updateMatchResult
6. advanceWinner + advanceLoser (bracket matches only)
7. GF reset detection: if GF match and LB winner (team_b) won → createResetMatch
8. checkPhaseComplete → seedNextPhase (round-robin or bracket)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- match-repository.ts: FOUND
- submit-match-result.ts: FOUND
- Commit f80b8db: FOUND
- Commit 5a5c223: FOUND
- FOR UPDATE in lockMatchForUpdate: FOUND
- pg_advisory_xact_lock in createResetMatch: FOUND
- matchRepository export in db/index.ts: FOUND
- submitMatchResult export in application/index.ts: FOUND
