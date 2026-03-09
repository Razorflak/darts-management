---
phase: quick-8
plan: "008"
subsystem: tournament-registration
tags: [ui, modal, player-search, dropdown, create-player]
dependency_graph:
  requires: [quick-7]
  provides: [player-search-fixed-dropdown, create-player-form]
  affects: [RegistrationModal.svelte, PlayerSearch.svelte]
tech_stack:
  added: []
  patterns: [position-fixed-dropdown, getBoundingClientRect, create-player-inline-form]
key_files:
  created: []
  modified:
    - packages/front/src/lib/tournament/components/PlayerSearch.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
decisions:
  - "PlayerSearch dropdown uses position:fixed + getBoundingClientRect — same pattern as DepartmentSelect to avoid modal overflow clipping"
  - "Native <input> with bind:this replaces Flowbite Input (Flowbite Input does not expose bind:this directly)"
  - "Slot 2 in doubles mode appears when slot 1 is either selected OR its create form is active"
  - "emptyNew() factory function avoids sharing mutable default object across resets"
metrics:
  duration: 2 min
  completed_date: "2026-03-09"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 2
---

# Quick Task 8: RegistrationModal — dropdown fix + create player form

**One-liner:** PlayerSearch dropdown fixed via position:fixed+getBoundingClientRect; RegistrationModal extended with inline create-player form for solo and each doubles slot.

## What Was Built

### Task 1 — PlayerSearch.svelte: dropdown position:fixed

The dropdown `<ul>` previously used `absolute z-10` positioning, which was clipped by Flowbite Modal's `overflow:hidden` container.

Fix applied (same pattern as `DepartmentSelect.svelte`):
- Switched from Flowbite `<Input>` to native `<input>` with `bind:this={inputEl}`
- Added `updatePosition()` using `inputEl.getBoundingClientRect()` to compute `top`, `left`, `width`
- Dropdown `<ul>` now uses `style="position:fixed;{dropdownStyle};z-index:9999"`
- Added `<svelte:window onscroll={updatePosition} onresize={updatePosition} />`
- `updatePosition()` called inside the fetch callback before setting `open`

### Task 2 — RegistrationModal.svelte: inline create-player form

Added a "Joueur non trouvé ? Créer un joueur" toggle button below each `PlayerSearch` slot:

**Solo mode:**
- Toggle shows/hides a form: prénom, nom, date naissance (required), n° licence, département
- When `showCreateSolo=true`, `PlayerSearch` is hidden
- `confirm()` dispatches `{ mode: "new", first_name, last_name, birth_date, licence_no?, department? }`

**Doubles mode:**
- Each slot (P1, P2) has an independent create form
- Slot 2 becomes visible when slot 1 has a selected player OR its create form is active
- `confirm()` dispatches `{ type: "new", ...fields }` for each slot creating a new player

**canConfirm** updated: `showCreateP1`/`showCreateP2` count as valid slot fulfillment.

**reset()** clears all create-form state on modal close.

Client-side validation checks `first_name`, `last_name`, `birth_date` before fetch.

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint Status

Task 3 (checkpoint:human-verify) reached — awaiting visual verification by user.

### Verification Steps

1. Open a tournament admin page: `/admin/events/[id]/tournaments/[tid]`
2. Click "Ajouter un joueur" (or "Ajouter une équipe" for doubles)
3. Type in the search field — results list must appear above the modal without being clipped
4. Click "Joueur non trouvé ? Créer un joueur" — form must appear (prénom, nom, date naissance, etc.)
5. Fill the form and confirm — player should be created and registered to the tournament
6. In doubles mode, verify each slot has its own "Créer un joueur" button

## Self-Check

- [x] `packages/front/src/lib/tournament/components/PlayerSearch.svelte` — modified
- [x] `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte` — modified
- [x] Commit bd2072e — Task 1 (PlayerSearch fix)
- [x] Commit 6bceb7e — Task 2 (RegistrationModal create form)
- [x] `pnpm typecheck` passes (0 errors)

## Self-Check: PASSED
