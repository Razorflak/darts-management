---
phase: 02-wizard-persistence
plan: 03
subsystem: ui
tags: [sveltekit, svelte5, flowbite-svelte, postgres, sql, events]

# Dependency graph
requires:
  - phase: 02-wizard-persistence
    plan: 01
    provides: event table with organizer_id, entity_id FK, event_status enum, tournament table
  - phase: 01-foundation
    provides: authz (getUserRoles), Better Auth user IDs, (app) layout server pattern
provides:
  - /events route with server load returning scoped events list (draft filter)
  - Events card grid UI with status badges, French labels, responsive layout
affects:
  - 02-04-ui (wizard redirect target now exists)
  - Any future phase adding event detail or edit pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PageServerLoad with auth guard (defense in depth alongside layout guard)
    - Two-branch SQL query: entityIds.length > 0 uses OR clause for entity visibility, else owner-only
    - Draft visibility rule: organizer always sees own events, entity members see non-draft only
    - Flowbite-Svelte Badge color uses 'gray' not 'dark' (valid color enum constraint)

key-files:
  created:
    - packages/front/src/routes/(app)/events/+page.server.ts
    - packages/front/src/routes/(app)/events/+page.svelte

key-decisions:
  - "Badge draft color: 'gray' instead of 'dark' — Flowbite-Svelte Badge color prop does not accept 'dark', 'gray' is the correct equivalent"
  - "Two-branch query instead of one: entityIds empty check avoids passing empty array to ANY() which could cause DB issues"
  - "Cards are display-only (no href) — event detail page is future scope"

patterns-established:
  - "Defense-in-depth auth guard: if (!locals.user) redirect(302, '/login') even inside (app) layout"
  - "Draft filter pattern: organizer_id = userId OR (entity_id = ANY(entityIds) AND status != 'draft')"

requirements-completed: [EVENT-01, EVENT-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 2 Plan 3: Events List Page Summary

**SvelteKit /events route with server load (draft-scoped SQL query) and Flowbite-Svelte Card grid showing event name, dates, location, entity, status badge, and tournament count**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T14:16:01Z
- **Completed:** 2026-03-01T14:18:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `+page.server.ts` with auth guard and SQL query implementing draft visibility rule
- SQL query returns events sorted by `starts_at DESC` with tournament count via LEFT JOIN + COUNT
- Created `+page.svelte` with responsive Card grid (1/2/3 columns), French status badges, French date formatting
- Empty state message when no events found
- "Créer un événement" button linking to `/events/new`

## Task Commits

Each task was committed atomically:

1. **Task 1: Events list server load** - `13dfb9b` (feat)
2. **Task 2: Events list card UI** - `66dc56d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `packages/front/src/routes/(app)/events/+page.server.ts` - Server load with auth guard, getUserRoles, scoped SQL query with draft filter
- `packages/front/src/routes/(app)/events/+page.svelte` - Card grid with Badge status, Button, French locale date formatting

## Decisions Made
- Badge color for `draft` status uses `'gray'` not `'dark'` — Flowbite-Svelte Badge color prop is constrained to Tailwind color names; `'dark'` is not in the valid union type
- Two-branch SQL query (with entity roles vs without) avoids passing an empty array to `ANY()` which could behave unexpectedly
- Cards are display-only (no `href`) — clicking cards to open event detail is out of scope for this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Badge 'dark' color replaced with 'gray'**
- **Found during:** Task 2 (Events list card UI)
- **Issue:** Plan specified `color="dark"` for draft status badge, but Flowbite-Svelte Badge `color` prop does not include `'dark'` in its type union — TypeScript error at line 44
- **Fix:** Changed `draft: 'dark'` to `draft: 'gray'` in STATUS_COLORS map; gray is visually equivalent and type-correct
- **Files modified:** packages/front/src/routes/(app)/events/+page.svelte
- **Verification:** svelte-check passes with no errors in +page.svelte
- **Committed in:** 66dc56d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug — invalid Badge color value)
**Impact on plan:** Necessary for TypeScript correctness; visual result is identical. No scope creep.

## Issues Encountered

Pre-existing TypeScript errors in `src/routes/(app)/events/new/save/+server.ts` and `src/routes/(app)/events/new/publish/+server.ts` (14 errors total from plan 02-02 — `TransactionSql<{}>` type issue with postgres.js `sql.begin()` callbacks). These are out of scope for this plan. Documented in deferred-items.

## User Setup Required
None — no external service configuration required. No environment changes needed.

## Next Phase Readiness
- `/events` page exists and renders event cards correctly
- Draft visibility rule implemented (organizer sees all own events; entity members see non-draft only)
- Ready for 02-04: redirect after wizard save/publish now has a valid landing page

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-01*
