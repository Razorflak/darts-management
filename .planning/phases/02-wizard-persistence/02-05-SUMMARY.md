---
phase: 02-wizard-persistence
plan: 05
subsystem: ui
tags: [svelte, postgres, sql, date-formatting, error-messages]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    provides: events list page (+page.server.ts, +page.svelte) and publish endpoint created in 02-03/02-04
provides:
  - Date columns in /events list displayed as DD/MM/YYYY strings (never 'Invalid date')
  - Descriptive 403 permission error on publish: 'droits organisateur' message
affects: [03-tournament-management, uat-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Postgres.js DATE columns cast to ::text in SQL for safe string serialization"
    - "formatDate() defensive: accepts string | null | undefined, guards isNaN, returns '' not placeholder"

key-files:
  created: []
  modified:
    - packages/front/src/routes/(app)/events/+page.server.ts
    - packages/front/src/routes/(app)/events/+page.svelte
    - packages/front/src/routes/(app)/events/new/publish/+server.ts

key-decisions:
  - "::text cast in SQL (not JS Date coercion) — postgres.js serializes DATE as full JS Date object; casting at source is the most robust fix"
  - "formatDate returns '' (empty string) for missing dates per user expectation 'laisser vide si pas de date saisie'"
  - "Date row hidden entirely (not shown as ' → ') when both starts_at and ends_at are absent"

patterns-established:
  - "Pattern: cast DATE/TIMESTAMP columns to ::text in SQL whenever consuming in a string context in Svelte"

requirements-completed: [EVENT-01, EVENT-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 02 Plan 05: UAT Bug Fixes — Date Display and Publish Error Message Summary

**::text SQL casts fix 'Invalid date' in /events list; descriptive 403 message replaces opaque 'Accès refusé.' on publish**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T17:07:27Z
- **Completed:** 2026-03-01T17:09:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed UAT Gap #12: postgres.js DATE objects no longer cause 'Invalid date' — `::text` casts in both SQL branches of +page.server.ts ensure columns arrive as 'YYYY-MM-DD' strings
- Fixed UAT Gap #11: publish/+server.ts 403 response now says "Vous n'avez pas les droits organisateur sur l'entité sélectionnée." instead of the opaque "Accès refusé."
- Hardened formatDate() to accept null/undefined, guard against NaN, and return '' (not '—') when no date is provided

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ::text casts to date columns and harden formatDate()** - `c6a66ba` (fix)
2. **Task 2: Replace opaque 'Accès refusé.' with descriptive permission message** - `88122ec` (fix)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `packages/front/src/routes/(app)/events/+page.server.ts` — Added `::text` casts on `starts_at`, `ends_at`, `registration_opens_at` in both SQL branches (entityIds > 0 and fallback)
- `packages/front/src/routes/(app)/events/+page.svelte` — formatDate() now accepts `string | null | undefined`, returns `''` for null/NaN; date row hidden when both dates absent
- `packages/front/src/routes/(app)/events/new/publish/+server.ts` — 403 error message now actionable: "Vous n'avez pas les droits organisateur sur l'entité sélectionnée."

## Decisions Made

- **::text in SQL, not JS coercion:** postgres.js materializes DATE columns as full JS Date objects (ISO timestamp). Appending 'T00:00' to an ISO timestamp produces 'Invalid Date'. Casting at the SQL level (`e.starts_at::text`) is the canonical fix — the string arrives as 'YYYY-MM-DD' which formatDate() appends 'T00:00' to correctly for local-timezone parsing.
- **Empty string not '—' for missing dates:** Per UAT user expectation "laisser vide si pas de date saisie" — returning '' and conditionally hiding the paragraph is cleaner than showing '—'.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both UAT gaps (Gap #11 and Gap #12) from 02-UAT are now closed
- /events list displays dates correctly as DD/MM/YYYY when present, empty when absent
- Publish endpoint provides actionable error messages
- Phase 02 UAT gaps are fully resolved — ready to proceed to Phase 03 or further UAT rounds

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-01*
