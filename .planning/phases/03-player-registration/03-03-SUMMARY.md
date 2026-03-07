---
phase: 03-player-registration
plan: "03"
subsystem: ui
tags: [svelte5, sveltekit, flowbite-svelte, zod, postgres, registration]

# Dependency graph
requires:
  - phase: 03-02
    provides: TournamentWithRegistrationSchema, PlayerSchema, locals.player auto-creation
provides:
  - "/events/[id] public event detail page with per-tournament self-registration"
  - "+layout.server.ts auth redirect preserving ?redirectTo= return URL"
  - "POST/DELETE /events/[id]/register API endpoint"
affects:
  - 03-04
  - 03-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Layout override pattern: child +layout.server.ts redirects with ?redirectTo= param, overriding parent (app) layout"
    - "Optimistic UI update: $state array mutation on fetch success without full page reload"
    - "EventDetailSchema = EventSchema.omit({ tournaments: true }) — schema slicing for partial views"

key-files:
  created:
    - packages/front/src/routes/(app)/events/[id]/+layout.server.ts
    - packages/front/src/routes/(app)/events/[id]/+page.server.ts
    - packages/front/src/routes/(app)/events/[id]/+page.svelte
    - packages/front/src/routes/(app)/events/[id]/register/+server.ts
  modified: []

key-decisions:
  - "Child +layout.server.ts overrides parent (app) redirect to add ?redirectTo=/events/[id] — keeps navbar, preserves return URL"
  - "EventDetailSchema = EventSchema.omit({ tournaments: true }) — avoids TournamentSchema.min(1) mismatch for player-facing view"
  - "currentPlayerId passed as SQL param (null when no player profile) — r_me LEFT JOIN returns false for is_registered, no error"
  - "DELETE endpoint is idempotent — no error if registration not found, event must still be 'ready'"

patterns-established:
  - "Route layout override: nested +layout.server.ts intercepts auth before page load runs"
  - "Optimistic UI: $state() local copy, mutate on fetch success, no invalidate/navigation needed"

requirements-completed:
  - PLAYER-01

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 03 Plan 03: Event Detail Page with Self-Registration Summary

**Public /events/[id] page with auth redirect preserving return URL, tournament listing, and optimistic register/unregister via POST/DELETE API**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T13:53:55Z
- **Completed:** 2026-03-07T13:56:42Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Anonymous visitors redirected to `/login?redirectTo=/events/[id]` (return URL preserved via layout override)
- Load function fetches event info + tournament list with per-player registration state in two SQL queries
- POST /events/[id]/register inserts registration with 409 on duplicate (catches PostgreSQL error 23505)
- DELETE /events/[id]/register removes registration idempotently, guarded by event status 'ready'
- UI shows S'inscrire / Inscrit + Se désinscrire buttons with optimistic state update

## Task Commits

1. **Task 1: Layout override + page load function** - `a3648da` (feat)
2. **Task 2: POST/DELETE /events/[id]/register API** - `3b7564f` (feat)
3. **Task 3: Event detail page UI** - `0b8b883` (feat)

## Files Created/Modified

- `packages/front/src/routes/(app)/events/[id]/+layout.server.ts` - Redirects unauthenticated visitors to /login?redirectTo=/events/[id]
- `packages/front/src/routes/(app)/events/[id]/+page.server.ts` - Loads event + tournaments with registration state for current player
- `packages/front/src/routes/(app)/events/[id]/+page.svelte` - Event detail UI with registration buttons
- `packages/front/src/routes/(app)/events/[id]/register/+server.ts` - POST/DELETE registration API endpoint

## Decisions Made

- `EventDetailSchema = EventSchema.omit({ tournaments: true })` — the public event page needs tournaments as `TournamentWithRegistration[]` not `Tournament[]` from the wizard; slicing the schema avoids redefining a type inline
- Child `+layout.server.ts` overrides parent `(app)` layout redirect — parent does plain `/login`, child adds `?redirectTo=`; SvelteKit runs innermost layout first
- `currentPlayerId` passed as SQL NULL param — PostgreSQL LEFT JOIN with NULL match always returns no rows, so `is_registered` is always false for users without a player profile; no special-casing needed

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Player self-registration flow fully functional
- Registration API ready for admin roster views (plan 03-04)
- Admin endpoints for managing registrations (plan 03-05) can now build on same tournament_registration table

---
*Phase: 03-player-registration*
*Completed: 2026-03-07*
