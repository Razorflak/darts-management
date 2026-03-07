# Plan 03-04 Summary: Dashboard + Public Roster

**Status:** Complete
**Tasks:** 2/2
**Phase:** 03-player-registration

## What Was Built

### Task 1 — Dashboard "Tournois disponibles"
Updated `packages/front/src/routes/(app)/+page.server.ts` and `+page.svelte` to show a "Tournois disponibles" section. The load function queries all `ready` events with their tournaments, groups flat rows by event_id in TypeScript, and computes `is_registered` per player via SQL `LEFT JOIN r_me`. Uses `TournamentWithRegistrationSchema` for Zod validation. The Svelte page renders event cards with tournament rows and register/unregister buttons that call `/events/[id]/register`.

### Task 2 — Public Tournament Roster `/tournaments/[id]`
Created `packages/front/src/routes/tournaments/[id]/+page.server.ts` and `+page.svelte` — a public route outside the `(app)` group, accessible without authentication. Loads tournament details and roster via two SQL queries validated with `TournamentDetailSchema` and `z.array(RosterEntrySchema)`. Page shows player list with check-in status (column hidden when `check_in_required=false`).

## Key Files

- `packages/front/src/routes/(app)/+page.server.ts` — dashboard load function
- `packages/front/src/routes/(app)/+page.svelte` — dashboard UI
- `packages/front/src/routes/tournaments/[id]/+page.server.ts` — public roster load
- `packages/front/src/routes/tournaments/[id]/+page.svelte` — public roster UI

## Commits

- `6aa6da4`: feat(03-04): dashboard section Tournois disponibles
- `3c5073f`: feat(03-04): public tournament roster page /tournaments/[id]

## Requirements Covered

- PLAYER-01 (self-registration entry point from dashboard)
