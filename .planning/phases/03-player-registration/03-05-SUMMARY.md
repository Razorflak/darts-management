---
phase: 03-player-registration
plan: "05"
subsystem: ui
tags: [sveltekit, flowbite-svelte, svelte5, admin, roster, check-in, tournament-status]

# Dependency graph
requires:
  - phase: 03-04
    provides: tournament.status column + AdminTournamentSchema + /admin/events/[id] page
  - phase: 03.1-teams-and-doubles-registration
    provides: findOrCreateSoloTeam, RosterEntrySchema, team_member model
provides:
  - Admin roster page at /admin/events/[id]/tournaments/[tid] with full management UI
  - Tournament status PATCH endpoint (ready→check-in→started→finished)
  - Check-in toggle per registration + bulk check-in endpoint
  - Admin register (existing or new player) + unregister endpoints
  - Player search autocomplete endpoint under (admin) route group
  - PlayerSearch component searchUrl prop (optional override of legacy URL)
affects:
  - phase-04 (tournament launch — status management used as gate)
  - any future admin UI that embeds PlayerSearch

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entity-level authz inline in each (admin) endpoint (fetch tournament+entity, getUserRoles, check role)
    - searchUrl prop on PlayerSearch as optional override — falls back to legacy URL for backwards compat

key-files:
  created:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/checkin/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/checkin-all/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/unregister/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/status/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/players/search/+server.ts
  modified:
    - packages/front/src/lib/tournament/components/PlayerSearch.svelte

key-decisions:
  - "PlayerSearch searchUrl is optional — falls back to /tournaments/${tournamentId}/admin/players/search for backwards compatibility with existing admin pages"
  - "STATUS_TRANSITIONS and STATUS_PREV maps in page.svelte enable linear forward + one-step-back transitions without server round-trips for validation"
  - "window.location.reload() used after register/registerNew — simpler than reactive roster update given roster requires server-side join aggregation"

patterns-established:
  - "Pattern: (admin) endpoint entity-level authz — always fetch tournament+entity_id first, then getUserRoles, then roles.some() check with 5-role list"
  - "Pattern: searchUrl optional prop on shared components — allows reuse across different route contexts without breaking existing callsites"

requirements-completed:
  - PLAYER-02
  - PLAYER-03
  - PLAYER-04

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 03 Plan 05: Admin Roster Page Summary

**Admin tournament roster at /admin/events/[id]/tournaments/[tid] with status transitions, per-team check-in, bulk check-in, and player add/remove — 8 server files + 1 Svelte page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T20:21:53Z
- **Completed:** 2026-03-08T20:25:37Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- All 7 API endpoints created under `(admin)/admin/events/[id]/tournaments/[tid]` with entity-level authz
- Admin roster page with status badge, forward/backward transition buttons, per-row check-in toggle, bulk check-in, player search/add, and new player creation form with DepartmentSelect
- PlayerSearch component updated to accept optional `searchUrl` prop for routing flexibility without breaking existing callers

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin roster load + API endpoints under (admin)** - `3d539d4` (feat)
2. **Task 2: Update PlayerSearch.svelte + admin roster UI page** - `062ed8b` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.server.ts` - Load tournament + roster with entity-level authz
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte` - Full admin roster UI
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/checkin/+server.ts` - POST toggle check-in for one registration
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/checkin-all/+server.ts` - POST bulk check-in all
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts` - POST register existing or new player
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/unregister/+server.ts` - DELETE remove team from roster
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/status/+server.ts` - PATCH change tournament status
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/players/search/+server.ts` - GET player autocomplete
- `packages/front/src/lib/tournament/components/PlayerSearch.svelte` - Added optional `searchUrl` prop

## Decisions Made
- `PlayerSearch.searchUrl` is optional with fallback — existing admin pages at `/tournaments/[id]/admin` continue to work without changes
- Linear status transitions with both forward and back buttons — STATUS_TRANSITIONS/STATUS_PREV records in page.svelte drive button visibility
- `window.location.reload()` after register actions — roster rebuild via server-side json_agg is simpler than incremental client-side update

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- SvelteKit `$types` not generated until `pnpm exec svelte-kit sync` is run — ran sync before typecheck, resolved cleanly
- Prettier formatting applied to PlayerSearch.svelte (pre-existing issue surfaced when file was modified)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Admin roster management complete (PLAYER-02, PLAYER-03, PLAYER-04 satisfied)
- Tournament status control in place — Phase 4 (tournament launch) can gate on tournament.status
- All admin roster endpoints follow the entity-level authz pattern established here

---
*Phase: 03-player-registration*
*Completed: 2026-03-08*
