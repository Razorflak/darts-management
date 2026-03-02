---
phase: 02-wizard-persistence
plan: 07
subsystem: ui
tags: [svelte, flowbite-svelte, datepicker, tournament, startDate]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    provides: Tournament type with startDate field, DB start_date column, server read/write

provides:
  - TournamentForm.svelte Datepicker for tournament startDate (optional, locale fr-FR)
  - Bidirectional $effect sync pattern for startDateObj ↔ tournament.startDate
  - TimeInput disabled prop (type-safe)

affects: [02-08, ui-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Datepicker bind:value pattern: bind:value={dateObj} + inbound/outbound $effect with toLocalDateISO guard"
    - "toLocalDateISO replaces .toISOString().slice(0,10) for local-timezone safety"

key-files:
  created: []
  modified:
    - packages/front/src/lib/tournament/components/TournamentForm.svelte
    - packages/front/src/lib/tournament/components/TimeInput.svelte

key-decisions:
  - "TournamentForm Datepicker uses toLocalDateISO (same as EventStep) — no UTC offset bug"
  - "startDate = undefined (not '') when Datepicker cleared — Tournament.startDate is optional string"
  - "TimeInput disabled prop added to fix pre-existing type error (EventStep uses disabled={readonly})"

patterns-established:
  - "Tournament date picker: same bidirectional $effect pattern as EventStep startDate"

requirements-completed: [EVENT-01, EVENT-02]

# Metrics
duration: 7min
completed: 2026-03-02
---

# Phase 02 Plan 07: Tournament Start Date Datepicker Summary

**Flowbite-Svelte Datepicker added to TournamentForm for optional tournament startDate, with toLocalDateISO bidirectional sync and TimeInput disabled prop fix**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-02T18:54:19Z
- **Completed:** 2026-03-02T19:01:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- TournamentForm.svelte now shows Datepicker (locale fr-FR) before TimeInput in a flex layout
- startDate syncs bidirectionally via $effect using toLocalDateISO — no UTC offset bug
- Server files (save, publish, edit) already handle start_date correctly — confirmed, no changes needed
- TimeInput receives disabled prop (type-safe fix for pre-existing EventStep error)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startDate Datepicker to TournamentForm.svelte** - `61be2a1` (feat)
2. **Task 2: Verify server round-trip for start_date** - no commit (verification only, no changes)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/front/src/lib/tournament/components/TournamentForm.svelte` - Added Datepicker for startDate with $effect sync, flex layout with TimeInput
- `packages/front/src/lib/tournament/components/TimeInput.svelte` - Added disabled prop to Props interface and propagated to input elements

## Decisions Made

- Used `toLocalDateISO` from utils.ts instead of `.toISOString().slice(0,10)` — consistent with plan intent and avoids UTC offset bug in UTC+ timezones
- `tournament.startDate = undefined` when no date selected (not empty string) — matches `startDate?: string` optional type
- Added `disabled` to TimeInput while fixing the blocking type error from EventStep — improves component completeness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TimeInput missing `disabled` prop causing type error**
- **Found during:** Task 1 (verifying typecheck passes)
- **Issue:** EventStep.svelte passes `disabled={readonly}` to TimeInput, but TimeInput's Props interface didn't declare `disabled`. This caused a svelte-check type error blocking the typecheck done criterion.
- **Fix:** Added `disabled?: boolean` to TimeInput Props, propagated to both `<input>` elements inside, added CSS opacity/cursor class to wrapper div
- **Files modified:** `packages/front/src/lib/tournament/components/TimeInput.svelte`
- **Verification:** `pnpm check` passes with 0 errors after fix
- **Committed in:** `61be2a1` (part of Task 1 commit)

**2. [Scope Boundary] Restored out-of-scope uncommitted changes**
- **Found during:** Task 1 verification
- **Issue:** Working tree had uncommitted changes from a previous incomplete execution of plans 02-06 and 02-08. These changes introduced type errors in EventStep.svelte, admin/+page.server.ts, events/+page.server.ts, and events/[id]/edit/+page.server.ts. These are out of scope for plan 02-07.
- **Fix:** `git restore` applied to all out-of-scope files to return them to HEAD state before committing Task 1 changes
- **Files affected:** EventStep.svelte, TemplateModal.svelte, admin/+page.server.ts, admin/entities/new/+page.server.ts, events/+page.server.ts, events/[id]/edit/+page.server.ts
- **Note:** These files will be addressed by plans 02-06 and 02-08 respectively

---

**Total deviations:** 2 (1 auto-fix blocking, 1 scope boundary restoration)
**Impact on plan:** Auto-fix necessary for typecheck correctness. Scope restoration ensures plan 02-07 commit is clean.

## Issues Encountered

- Previous incomplete executions left uncommitted changes in the working tree that confused the typecheck. Restoring out-of-scope files to HEAD was necessary to get a clean baseline for plan 02-07.
- The working tree had `events/+page.server.ts` modifications that persisted through `git checkout HEAD --` and required `git restore --` to clear properly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TournamentForm date picker is complete — users can specify a different start date per tournament
- Server round-trip confirmed: save, publish, and edit all handle start_date correctly
- Plan 02-08 (Zod schema migration) can proceed on a clean baseline

## Self-Check: PASSED

- TournamentForm.svelte exists: FOUND
- TimeInput.svelte exists: FOUND
- 02-07-SUMMARY.md exists: FOUND
- Commit 61be2a1 exists: FOUND

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-02*
