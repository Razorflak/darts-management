---
phase: 02-wizard-persistence
plan: 07
subsystem: ui
tags: [sveltekit, typescript, sql, flowbite-svelte, wizard, events]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    provides: event/tournament DB schema, save/publish endpoints that handle eventId UPDATE path, /events list page
provides:
  - /events/[id]/edit route with server load (auth guard + ownership check + DB fetch)
  - Edit wizard pre-populated with existing event/tournament data from DB
  - eventId pre-initialized so all saves trigger UPDATE (not INSERT)
  - Reprendre l'édition link on draft event cards in /events list
affects: [UAT, phase 03, event editing flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edit page reuses save/publish endpoints with pre-set eventId to trigger UPDATE path"
    - "Ownership guard: WHERE organizer_id = userId AND status = 'draft' — redirects silently (no 404 leak)"
    - "Reprendre link gated on event.status === 'draft' in template"

key-files:
  created:
    - packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
    - packages/front/src/routes/(app)/events/[id]/edit/+page.svelte
  modified:
    - packages/front/src/routes/(app)/events/+page.svelte

key-decisions:
  - "Redirect to /events (not 404) when draft not found — avoids leaking event existence to non-owners"
  - "Reuse /events/new/save and /events/new/publish endpoints — eventId in body triggers UPDATE path, no new endpoints needed"
  - "Draft-only Reprendre link — published events are read-only in Phase 2"

patterns-established:
  - "Edit route pattern: load → map DB→TS → return {event, tournaments, entities, eventId}"

requirements-completed: [EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, EVENT-06]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 02 Plan 07: Edit Draft Event — Resume Wizard Summary

**Edit route /events/[id]/edit with pre-populated wizard and Reprendre links on draft cards — closes UAT gap of dead-end saved drafts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T18:02:34Z
- **Completed:** 2026-03-01T18:06:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created /events/[id]/edit with auth guard, ownership check, and silent redirect on not-found
- Edit wizard loads event + tournaments from DB and initializes with pre-populated data
- eventId set from data.eventId at page load so first Save triggers UPDATE (no duplicate INSERT)
- Added "Reprendre l'édition →" link on draft cards in /events list

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /events/[id]/edit server load** - `63d01ed` (feat)
2. **Task 2: Create edit wizard page + add Reprendre links** - `115ba38` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts` - Server load: auth guard, draft ownership check, event + tournament fetch, entity load, DB→TS mapping
- `packages/front/src/routes/(app)/events/[id]/edit/+page.svelte` - Edit wizard pre-populated from data.event/data.tournaments, eventId from data.eventId
- `packages/front/src/routes/(app)/events/+page.svelte` - Added Reprendre l'édition link inside draft event cards

## Decisions Made
- Redirect to /events (not 404) when draft not found — avoids leaking event existence to non-owners
- Reuse /events/new/save and /events/new/publish endpoints — the eventId field in the POST body triggers the UPDATE path server-side, no new endpoints needed
- Reprendre link only shown for status === 'draft' — published events are read-only in Phase 2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Draft event cards now have working "Reprendre" links leading to pre-populated wizard
- Editing and re-publishing a draft event (UPDATE path) is functional end-to-end
- UAT gap closed: saved draft is no longer a dead end

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-01*
