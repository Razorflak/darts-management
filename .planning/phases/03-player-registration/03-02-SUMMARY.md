---
phase: 03-player-registration
plan: "02"
subsystem: schemas-and-hooks
tags: [zod, schemas, hooks, player, registration]
dependency_graph:
  requires: [03-01]
  provides: [PlayerSchema, TournamentRegistrationSchema, TournamentWithRegistrationSchema, RosterEntrySchema, PlayerSearchResultSchema, locals.player]
  affects: [03-03, 03-04, 03-05]
tech_stack:
  added: []
  patterns: [zod-first-typing, ON-CONFLICT-DO-NOTHING-race-guard, svelte-hooks-player-bootstrap]
key_files:
  created: []
  modified:
    - packages/front/src/lib/server/schemas/event-schemas.ts
    - packages/front/src/hooks.server.ts
    - packages/front/src/app.d.ts
decisions:
  - "ON CONFLICT DO NOTHING in player INSERT + re-SELECT pattern guards against concurrent first-login requests"
  - "birth_date::text cast in SQL SELECT — DATE returned as text, parsed by z.string() not z.coerce.date()"
  - "Name split best-effort: parts[0]=first_name, parts.slice(1).join(' ')||parts[0]=last_name — placeholder birth_date '1900-01-01'"
  - "Pre-existing svelte-check errors in TournamentForm.svelte (e.target null checks) are out of scope — 2 errors present before and after this plan"
metrics:
  duration: "3 min"
  completed_date: "2026-03-07"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 02: Zod Schemas + Player Auto-Creation Summary

**One-liner:** Five Phase 3 Zod schemas added to event-schemas.ts; hooks.server.ts bootstraps a player profile on first login via ON CONFLICT DO NOTHING insert + re-SELECT.

## What Was Built

### Task 1: Zod schemas pour les entités Phase 3 (fb8d359)

Added 5 new exports to `packages/front/src/lib/server/schemas/event-schemas.ts`:

- `PlayerSchema` / `Player` — id, user_id, first_name, last_name, birth_date (text), licence_no
- `TournamentRegistrationSchema` / `TournamentRegistration` — id, tournament_id, player_id, checked_in, registered_at (coerce.date)
- `TournamentWithRegistrationSchema` / `TournamentWithRegistration` — tournament view with registration_count and is_registered for public event page
- `RosterEntrySchema` / `RosterEntry` — combined player+registration data for roster views
- `PlayerSearchResultSchema` / `PlayerSearchResult` — slimmed player data for admin search endpoint

All types derived via `z.infer<>`, no inline type definitions.

### Task 2: Auto-création du profil joueur dans hooks.server.ts (c028851)

**app.d.ts:** Added `player: import('$lib/server/schemas/event-schemas.js').Player | null` to `interface Locals`.

**hooks.server.ts:** Extended `authHandle` with player bootstrap logic:
1. If `!locals.user` → `locals.player = null`, early continue
2. `SELECT ... FROM player WHERE user_id = $userId LIMIT 1`
3. If found → parse with `z.array(PlayerSchema)`, assign `locals.player`
4. If not found → `INSERT INTO player ... ON CONFLICT DO NOTHING`, then re-SELECT to get created row
5. All SQL uses `sql<Record<string, unknown>[]>` pattern per project conventions

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist

- (no new files to check)

### Commits exist
- fb8d359: feat(03-02): add Phase 3 Zod schemas to event-schemas.ts
- c028851: feat(03-02): auto-create player profile in hooks.server.ts + declare locals.player

## Self-Check: PASSED
