---
phase: quick-7
plan: "01"
subsystem: admin-tournament-roster
tags: [modal, registration, deduplication, svelte, refactor]
dependency_graph:
  requires: []
  provides:
    - RegistrationModal.svelte component
    - Server-side player dedup in register endpoint
  affects:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
tech_stack:
  added: []
  patterns:
    - $bindable open prop for modal reset via $effect
    - Sequential doubles UX via $state conditional rendering
    - $derived canConfirm for conditional confirm button
    - Server-side ANY() dedup query before team creation
key_files:
  created:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
  modified:
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
decisions:
  - Modal extracted to RegistrationModal.svelte — solo and doubles UX in one component
  - Reset via $effect on open prop (false triggers reset()) — idiomatic Svelte 5
  - canConfirm as $derived — prevents confirm button appearing until slots filled
  - checkNoDuplicatePlayers() runs after resolvePlayerId but before team creation — correct order
  - player1 === player2 guard returns 400 before DB query — fast path for doubles same-player error
  - Biome auto-format applied to all 3 modified files
metrics:
  duration: "3 min"
  completed_date: "2026-03-08"
  tasks_completed: 3
  files_modified: 3
---

# Quick Task 007: Fix Modal Inscription Tournoi — Doublon Summary

**One-liner:** Extracted RegistrationModal.svelte with sequential doubles UX, conditional confirm button, reset-on-close, and server-side 409/400 dedup checks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dédoublonnage serveur dans register/+server.ts | 4e34c61 | register/+server.ts |
| 2 | Créer RegistrationModal.svelte | b2eec71 | RegistrationModal.svelte (new) |
| 3 | Refactor +page.svelte — utiliser RegistrationModal | 82fbbbb | +page.svelte, RegistrationModal.svelte, register/+server.ts |

## What Was Built

### Task 1 — Server deduplication

Added `checkNoDuplicatePlayers(playerIds, tournamentId)` to `register/+server.ts`:

- Queries `player JOIN team_member JOIN tournament_registration` with `p.id = ANY(${playerIds})`
- Returns 409 with player name if already registered in this tournament
- Returns 400 if `player1Id === player2Id` in doubles mode (same-player guard)
- Check runs after `resolvePlayerId` (new players created first) but before team creation

### Task 2 — RegistrationModal.svelte

New isolated component with:

- **Props:** `open` ($bindable), `isDoubles`, `baseUrl`, `onRegistered` callback
- **Solo UX:** PlayerSearch → selected player summary block with "Changer" button
- **Doubles UX:** sequential — player 1 search, then player 2 section appears only after player 1 selected
- **Conditional confirm:** `$derived canConfirm` — button only shown when required slots filled
- **Reset:** `$effect` on `open` calls `reset()` when modal closes
- **Error display:** inline `<p class="text-sm text-red-600">` instead of `alert()`

### Task 3 — +page.svelte refactor

Removed ~200 lines of inline modal logic:
- Deleted: `selectedPlayer`, `selectedPlayer1/2`, `showNewPlayerForm`, `newFirst/Last/Birth/etc`, `showNewPlayer1/2Form`, `newPlayer1/2` state vars
- Deleted: `registerExisting`, `registerNew`, `buildSlot`, `registerDoubles`, `handlePlayerSelected` functions
- Deleted: entire `<Modal>` block (~180 lines)
- Replaced with: `<RegistrationModal bind:open={showAddModal} {isDoubles} {baseUrl} onRegistered={() => window.location.reload()} />`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Formatting] Biome auto-format applied**
- **Found during:** Task 3 (lint check)
- **Issue:** Modified files had formatting and import-sorting warnings per Biome config
- **Fix:** Ran `biome check --write` on all three modified files
- **Files modified:** RegistrationModal.svelte, register/+server.ts, +page.svelte
- **Commit:** 82fbbbb (included in Task 3 commit)

No other deviations — plan executed as written.

## Self-Check: PASSED

- RegistrationModal.svelte: EXISTS at packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
- +page.svelte: MODIFIED, no inline modal logic remaining
- register/+server.ts: MODIFIED, checkNoDuplicatePlayers() present
- Commits: 4e34c61, b2eec71, 82fbbbb — all verified in git log
- `pnpm --filter front exec tsc --noEmit`: PASSED
