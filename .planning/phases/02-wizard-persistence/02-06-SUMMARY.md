---
phase: 02-wizard-persistence
plan: "06"
subsystem: ui
tags: [svelte, flowbite-svelte, datepicker, timezone, date-formatting]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    provides: EventStep.svelte, TemplateModal.svelte, and utils.ts from prior plans

provides:
  - toLocalDateISO(d) utility in utils.ts — local-timezone YYYY-MM-DD formatting
  - UTC-safe date conversion in TemplateModal.svelte (template apply)
  - UTC-safe date conversion in EventStep.svelte (all 6 inbound/outbound $effects)
  - registrationOpensAt Datepicker retains selected date via onselect handler

affects:
  - any future plan touching date fields in the wizard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toLocalDateISO() via getFullYear/getMonth/getDate — never toISOString() for date-only fields"
    - "Flowbite-Svelte Datepicker: bind:value for two-way binding; onselect for one-way with custom logic"

key-files:
  created: []
  modified:
    - packages/front/src/lib/tournament/utils.ts
    - packages/front/src/lib/tournament/components/TemplateModal.svelte
    - packages/front/src/lib/tournament/components/EventStep.svelte

key-decisions:
  - "toLocalDateISO uses getFullYear/getMonth/getDate — avoids UTC midnight rollback in UTC+ timezones"
  - "Flowbite-Svelte Datepicker onselect prop receives DateOrRange (Date | {from,to}) not a DOM Event — use instanceof Date guard"
  - "registrationDateObj Datepicker uses onselect (not bind:value) to fix date retention; startDateObj/endDateObj keep bind:value"

patterns-established:
  - "Date formatting pattern: always toLocalDateISO(d), never d.toISOString().slice(0,10)"
  - "Datepicker onselect handler: (d) => { registrationDateObj = d instanceof Date ? d : undefined }"

requirements-completed: [EVENT-01, EVENT-04]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 2 Plan 06: UTC Date Offset Fix Summary

**toLocalDateISO() utility added to utils.ts; all 6 wizard date effects migrated from toISOString() to local-timezone conversion; registrationOpensAt Datepicker fixed to retain selection via onselect**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T14:00Z
- **Completed:** 2026-03-02T14:05Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `toLocalDateISO(d: Date): string` to utils.ts using `getFullYear/getMonth/getDate` — no UTC midnight rollback for UTC+ users
- Fixed TemplateModal.svelte: removed local `toISO()` function, replaced 3 call sites with `toLocalDateISO`, removed cosmetic `style="toto"` artifact
- Fixed EventStep.svelte: replaced all 6 `.toISOString().slice(0,10)` occurrences (3 inbound + 3 outbound $effects) with `toLocalDateISO`
- Fixed registrationOpensAt Datepicker to retain selection using `onselect` handler instead of `bind:value`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add toLocalDateISO utility** - `751354e` (feat)
2. **Task 2: Fix date conversion in TemplateModal and EventStep** - `1eb2889` (fix)

**Plan metadata:** committed with final docs commit

## Files Created/Modified
- `packages/front/src/lib/tournament/utils.ts` - Added `toLocalDateISO(d: Date): string` export
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` - Import toLocalDateISO, remove local toISO, fix 3 date calls, remove style=toto
- `packages/front/src/lib/tournament/components/EventStep.svelte` - Import toLocalDateISO, fix 6 date effects, fix registrationOpensAt Datepicker binding

## Decisions Made
- Used `getFullYear/getMonth/getDate` (local timezone) instead of `toISOString().slice(0,10)` (UTC) — correct approach for date-only fields in UTC+ regions
- Flowbite-Svelte Datepicker's custom event is `onselect: (x: DateOrRange) => void` not `onchange` (which is a DOM HTMLDivElement event) — required `instanceof Date` guard since `DateOrRange = Date | { from?: Date; to?: Date }`
- `registrationDateObj` uses `onselect` (one-way) while `startDateObj`/`endDateObj` keep `bind:value` (two-way) since those already work correctly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong Datepicker event name — onchange is DOM event, onselect is Datepicker custom event**
- **Found during:** Task 2 (EventStep.svelte registrationDateObj binding)
- **Issue:** Plan specified `onchange={(d) => { registrationDateObj = d }}` but Flowbite-Svelte Datepicker has no `onchange` prop — it inherits from `HTMLAttributes<HTMLDivElement>` making `onchange` a DOM event receiving `Event` not `Date`
- **Fix:** Used `onselect={(d) => { registrationDateObj = d instanceof Date ? d : undefined }}` — correct Flowbite-Svelte Datepicker API with `DateOrRange` type guard
- **Files modified:** packages/front/src/lib/tournament/components/EventStep.svelte
- **Verification:** svelte-check no longer reports type error at line 150 in EventStep.svelte
- **Committed in:** `1eb2889` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's API reference)
**Impact on plan:** Fix was essential for type correctness and correct Datepicker behavior. No scope creep.

## Issues Encountered
- Pre-existing svelte-check errors in `db/src/authz.ts`, `events/+page.server.ts`, `events/[id]/edit/+page.server.ts`, and `admin/` routes — out of scope, not caused by this plan's changes, documented but not fixed

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Date handling is now UTC-safe throughout the wizard
- toLocalDateISO() available for any future date fields
- Ready for plan 02-07

## Self-Check: PASSED

- utils.ts — FOUND
- TemplateModal.svelte — FOUND
- EventStep.svelte — FOUND
- SUMMARY.md — FOUND
- Commit 751354e — FOUND
- Commit 1eb2889 — FOUND

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-02*
