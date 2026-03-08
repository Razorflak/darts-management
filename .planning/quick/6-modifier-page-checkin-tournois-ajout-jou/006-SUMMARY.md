---
phase: quick-6
plan: "06"
subsystem: admin-tournament-roster
tags: [admin, tournament, roster, doubles, modal, ui]
dependency_graph:
  requires:
    - findOrCreateDoublesTeam (packages/front/src/lib/server/teams.ts)
    - PlayerSearch component
    - flowbite-svelte Modal component
  provides:
    - POST /register with doubles mode (player1/player2 slots, existing or new)
    - Roster UI with modal add, real-time filter, row borders
  affects:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
tech_stack:
  added: []
  patterns:
    - discriminatedUnion with nested discriminatedUnion (PlayerSlotSchema inside doubles branch)
    - resolvePlayerId() helper abstracts existing/new player creation for doubles
    - $derived filteredRoster for real-time text filter without server round-trip
    - isDoubles const derived from DOUBLE_CATEGORIES array — no $state needed (category is static)
key_files:
  created: []
  modified:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
decisions:
  - PlayerSlotSchema defined in +server.ts (not event-schemas.ts) — request-schema pattern, not domain type
  - resolvePlayerId() helper keeps doubles handler clean without repeating INSERT block
  - buildSlot() in page.svelte mirrors server-side PlayerSlotSchema shape for type consistency
  - isDoubles as plain const (not $state/$derived) — data.tournament.category never mutates
  - Filter applied on roster $state (client-side) — no server round-trip needed for simple text filter
  - Removed checkInAll() function entirely — /checkin-all server endpoint left in place, UI no longer exposes it
metrics:
  duration: "~8 min"
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 006: Tournament Roster UI — Modal Add + Doubles Support

**One-liner:** Extended /register endpoint with doubles mode (nested player slots) and rewrote roster admin UI with contextual modal, real-time filter, row borders, and "Tout checker" removal.

## What Was Built

### Task 1 — /register endpoint extended for doubles

Added `PlayerSlotSchema` (discriminated union: `existing` with UUID or `new` with full player fields) and a new `doubles` branch to `AdminRegisterSchema`. A `resolvePlayerId()` helper handles INSERT for new players, keeping the doubles handler clean. The handler calls `findOrCreateDoublesTeam(player1Id, player2Id)` which is idempotent — if the pair already has a team together, it is reused.

Solo modes (`existing`, `new`) are unchanged.

### Task 2 — UI refactor

- **Modal add:** Replaced inline Card with a `<Modal>` triggered by a contextual button ("Ajouter un joueur" or "Ajouter une équipe" depending on `isDoubles`).
- **Doubles UI:** Two stacked PlayerSearch slots (Joueur 1 / Joueur 2), each with their own "Nouveau joueur" toggle and mini-form. `registerDoubles()` calls POST /register with `mode: "doubles"`.
- **Filter:** `filterQuery` $state + `filteredRoster` $derived — matches on `last_name first_name` and `first_name last_name` for flexible search. Input shown above table when roster is non-empty.
- **Row borders:** `class="border-b border-gray-100"` on each `<TableBodyRow>`.
- **"Tout checker" removed:** Button and `checkInAll()` function deleted. Server endpoint `/checkin-all` untouched.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts` — modified
- [x] `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte` — modified
- [x] Commit 923a55b — feat(quick-6): extend /register endpoint for doubles mode
- [x] Commit 5f57924 — feat(quick-6): refactor tournament roster UI — modal, filter, borders, no bulk check-in
- [x] "Tout checker" absent from +page.svelte (0 occurrences)
- [x] `filteredRoster` used in `{#each}` at line 268
- [x] `border-b border-gray-100` on TableBodyRow at line 269
- [x] `showAddModal` controls modal open/close
- [x] typecheck passes (tsc --noEmit — no output)

## Self-Check: PASSED
