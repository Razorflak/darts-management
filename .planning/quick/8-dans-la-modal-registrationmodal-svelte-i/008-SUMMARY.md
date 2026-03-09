---
phase: quick-8
plan: "008"
subsystem: tournament-registration
tags: [ui, modal, player-search, dropdown, create-player, component-extraction]
dependency_graph:
  requires: [quick-7]
  provides: [player-search-fixed-dropdown, create-player-form, MinimumPlayerCreationForm]
  affects: [RegistrationModal.svelte, PlayerSearch.svelte, MinimumPlayerCreationForm.svelte]
tech_stack:
  added: []
  patterns: [position-fixed-dropdown, getBoundingClientRect, bindable-props, component-extraction]
key_files:
  created:
    - packages/front/src/lib/tournament/components/MinimumPlayerCreationForm.svelte
  modified:
    - packages/front/src/lib/tournament/components/PlayerSearch.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
decisions:
  - "PlayerSearch dropdown uses position:fixed + getBoundingClientRect — same pattern as DepartmentSelect to avoid modal overflow clipping"
  - "Native <input> with bind:this replaces Flowbite Input (Flowbite Input does not expose bind:this directly)"
  - "Slot 2 in doubles mode appears when slot 1 is either selected OR its create form is active"
  - "emptyNew() factory function avoids sharing mutable default object across resets"
  - "MinimumPlayerCreationForm fields: first_name, last_name (required), department via DepartmentSelect (optional) — birthday excluded (nullable in DB)"
metrics:
  duration: 15 min
  completed_date: "2026-03-09"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Quick Task 8: RegistrationModal — dropdown fix + create player form

**One-liner:** PlayerSearch dropdown fixed via position:fixed+getBoundingClientRect; RegistrationModal extended with MinimumPlayerCreationForm component (prénom, nom, département) for solo and each doubles slot.

## What Was Built

### Task 1 — PlayerSearch.svelte: dropdown position:fixed

The dropdown `<ul>` previously used `absolute z-10` positioning, clipped by Flowbite Modal's `overflow:hidden` container.

Fix applied (same pattern as `DepartmentSelect.svelte`):
- Switched from Flowbite `<Input>` to native `<input>` with `bind:this={inputEl}`
- Added `updatePosition()` using `inputEl.getBoundingClientRect()` to compute `top`, `left`, `width`
- Dropdown `<ul>` now uses `style="position:fixed;{dropdownStyle};z-index:9999"`
- Added `<svelte:window onscroll={updatePosition} onresize={updatePosition} />`
- `updatePosition()` called inside the fetch callback before setting `open`

Commit: `bd2072e`

### Task 2 — RegistrationModal.svelte: create-player toggle + MinimumPlayerCreationForm

Two parts delivered together:

**MinimumPlayerCreationForm.svelte** (new component, `src/lib/tournament/components/`):
- Props: `first_name`, `last_name`, `department` — all `$bindable`
- Fields: prénom (required), nom (required), département via `DepartmentSelect.svelte` (optional)
- `birthday` excluded — nullable in DB, not needed in minimal registration form

**RegistrationModal.svelte** updated:
- "Joueur non trouvé ? Créer un joueur" toggle button below each `PlayerSearch` slot
- Solo: `showCreateSolo` toggles `MinimumPlayerCreationForm` bound to `newSolo`
- Doubles P1: `showCreateP1` toggles form bound to `newP1`; slot P2 appears once P1 is filled or creating
- Doubles P2: `showCreateP2` toggles form bound to `newP2`
- `confirm()` dispatches `mode: "new"` (solo) or `type: "new"` (doubles slot) to register endpoint
- Client-side validation: `first_name` + `last_name` required before fetch
- `canConfirm` counts `showCreatePx` as valid slot fulfillment
- `reset()` clears all create-form state on modal close

Commit: `0a30a89`

## Deviations from Plan

### Post-checkpoint correction (user feedback)

**Found during:** Task 3 (human-verify)
**Issue:** Initial form included `birth_date` and `licence_no` fields not aligned with the doubles registration modal pattern
**Fix:** Removed both fields; extracted form into `MinimumPlayerCreationForm.svelte`; used `DepartmentSelect.svelte` for département
**Files modified:** `MinimumPlayerCreationForm.svelte` (created), `RegistrationModal.svelte`
**Commit:** `0a30a89`

## Self-Check

- [x] `packages/front/src/lib/tournament/components/MinimumPlayerCreationForm.svelte` — created (commit 0a30a89)
- [x] `packages/front/src/lib/tournament/components/PlayerSearch.svelte` — modified (commit bd2072e)
- [x] `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte` — modified (commits 6bceb7e, 0a30a89)
- [x] `pnpm typecheck` passes (0 errors)

## Self-Check: PASSED
