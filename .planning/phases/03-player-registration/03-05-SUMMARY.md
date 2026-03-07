# Plan 03-05 Summary: Admin Roster + Check-in

**Status:** Complete
**Tasks:** 3/3
**Phase:** 03-player-registration

## What Was Built

### Task 1 — Admin API Endpoints
Created 5 `+server.ts` endpoints under `packages/front/src/routes/tournaments/[id]/admin/`:
- `register/+server.ts` — POST: admin adds player by ID (creates new profile if needed), catches 23505 → 409
- `unregister/+server.ts` — DELETE: removes registration
- `checkin/+server.ts` — PATCH: toggles `checked_in` for one player
- `checkin-all/+server.ts` — POST: bulk UPDATE sets `checked_in = true` for all registrations in tournament (atomic single query)
- `players/search/+server.ts` — GET `?q=`: ILIKE search on `last_name`, `first_name`, `licence_no` returning `PlayerSearchResultSchema`

All endpoints share an inline `requireAdmin` helper using `getUserRoles()` — returns 401/403 on auth failure.

### Task 2 — Admin Load + PlayerSearch Component
Created `packages/front/src/routes/tournaments/[id]/admin/+page.server.ts` loading tournament details, roster, and verifying admin access via `getUserRoles`. Created `packages/front/src/lib/tournament/components/PlayerSearch.svelte` — Svelte 5 runes component with `$effect` debounce (300ms `setTimeout`), fetches `/tournaments/[id]/admin/players/search?q=` on input, shows dropdown results.

### Task 3 — Admin Roster UI
Created `packages/front/src/routes/tournaments/[id]/admin/+page.svelte` with full roster table: per-row check-in toggle button and "Retirer" unregister button; "Tout checker" bulk check-in button; conditional "Présent" column hidden when `check_in_required=false`; `<PlayerSearch>` component integrated into an "Ajouter un joueur" section that calls the register endpoint on selection.

## Key Files

- `packages/front/src/routes/tournaments/[id]/admin/+page.server.ts`
- `packages/front/src/routes/tournaments/[id]/admin/+page.svelte`
- `packages/front/src/lib/tournament/components/PlayerSearch.svelte`
- `packages/front/src/routes/tournaments/[id]/admin/register/+server.ts`
- `packages/front/src/routes/tournaments/[id]/admin/unregister/+server.ts`
- `packages/front/src/routes/tournaments/[id]/admin/checkin/+server.ts`
- `packages/front/src/routes/tournaments/[id]/admin/checkin-all/+server.ts`
- `packages/front/src/routes/tournaments/[id]/admin/players/search/+server.ts`

## Commits

- `91c797f`: feat(03-05): admin API endpoints — register, unregister, check-in, search
- `4818694`: feat(03-05): admin load function + PlayerSearch autocomplete component
- `00d28ac`: feat(03-05): admin roster UI — check-in toggles, bulk check-in, player search and add form

## Requirements Covered

- PLAYER-02 (admin manual registration)
- PLAYER-03 (admin check-in)
- PLAYER-04 (check-in configurable per tournament)
