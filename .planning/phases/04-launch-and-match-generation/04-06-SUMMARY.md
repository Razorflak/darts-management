---
phase: 04-launch-and-match-generation
plan: "06"
subsystem: ui
tags: [svelte, zod, postgres, wizard, match-format]

requires:
  - phase: 04-01
    provides: sets_to_win/legs_per_set columns in phase table (DB migration)

provides:
  - GroupPhaseSchema extended with sets_to_win (default 2) and legs_per_set (default 3)
  - PhaseCard wizard card shows match format inputs for group phases
  - insertPhases persists sets_to_win and legs_per_set to the phase table

affects: [04-03, 04-04, launch-wizard]

tech-stack:
  added: []
  patterns:
    - "Zod .default() for backward-compatible schema extension with DB defaults"
    - "Wizard factory functions (createGroupPhase) carry explicit defaults matching schema defaults"

key-files:
  created: []
  modified:
    - packages/domain/src/tournoi/phase-schemas.ts
    - packages/front/src/lib/tournament/components/phases/PhaseCard.svelte
    - packages/db/src/repositories/tournament-repository.ts
    - packages/front/src/lib/tournament/utils.ts
    - packages/front/src/lib/tournament/templates.ts

key-decisions:
  - "z.number().int().positive().default(2/3) on GroupPhaseSchema — Zod defaults handle backward compatibility for existing DB rows and old wizard state"
  - "createGroupPhase factory and EVENT_TEMPLATES carry explicit sets_to_win:2/legs_per_set:3 — wizard state needs explicit values, Zod defaults only apply at parse time"
  - "insertPhases uses ?? 2 / ?? 3 fallback in addition to schema defaults — extra safety for any unparse data reaching the repository"

patterns-established:
  - "When extending a domain schema with new optional fields, always add explicit values to factory functions and template objects"

requirements-completed: [LAUNCH-04]

duration: 2min
completed: 2026-04-02
---

# Phase 04 Plan 06: Match Format Config for Group Phases Summary

**GroupPhaseSchema extended with sets_to_win/legs_per_set (Zod defaults 2/3), wizard PhaseCard shows "Sets gagnants" and "Legs par set" inputs, and insertPhases persists both columns to the phase table**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T21:40:49Z
- **Completed:** 2026-04-02T21:42:35Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- GroupPhaseSchema now includes `sets_to_win: z.number().int().positive().default(2)` and `legs_per_set: z.number().int().positive().default(3)` — backward-compatible with existing rows
- PhaseCard wizard group phase section shows two new numeric inputs ("Sets gagnants" min 1–5, "Legs par set" min 1–9) bound to phase.sets_to_win and phase.legs_per_set
- `insertPhases` in tournament-repository now includes sets_to_win and legs_per_set in the group phase INSERT with `?? 2` / `?? 3` fallback guards
- `createGroupPhase` factory and EVENT_TEMPLATES updated to carry explicit defaults so new wizard phases start with correct values

## Task Commits

1. **Task 1: Add sets_to_win/legs_per_set to GroupPhaseSchema + wizard card + insertPhases** - `2dc2c59` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `packages/domain/src/tournoi/phase-schemas.ts` — GroupPhaseSchema extended with sets_to_win/legs_per_set fields with Zod defaults
- `packages/front/src/lib/tournament/components/phases/PhaseCard.svelte` — Added match format inputs inside isGroupPhase block
- `packages/db/src/repositories/tournament-repository.ts` — insertPhases group phase INSERT includes sets_to_win and legs_per_set columns
- `packages/front/src/lib/tournament/utils.ts` — createGroupPhase factory returns sets_to_win:2, legs_per_set:3
- `packages/front/src/lib/tournament/templates.ts` — doubleKOPhase and classicPoolPhase templates include explicit defaults

## Decisions Made

- `z.number().int().positive().default(2/3)` on GroupPhaseSchema ensures backward compatibility: existing DB rows (which get column DEFAULT from migration 04-01) and old wizard state parse correctly without these fields present.
- `createGroupPhase` factory and EVENT_TEMPLATES carry explicit `sets_to_win: 2, legs_per_set: 3` — Zod `.default()` only applies at parse time; wizard rune state needs explicit initial values.
- `?? 2` / `?? 3` fallback in `insertPhases` is an extra safety net for any data that bypasses Zod parsing before reaching the repository.

## Deviations from Plan

None - plan executed exactly as written.

The plan mentioned checking where new phases are created and adding defaults. Found two locations beyond PhaseCard.svelte: `createGroupPhase` in `utils.ts` and template objects in `templates.ts`. Both were updated with explicit defaults as instructed by the plan action step.

## Issues Encountered

None. Pre-existing lint warnings in PhaseCard.svelte (unused imports) and other front-end files are out of scope and pre-date this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-03 (launch endpoint) can now read sets_to_win/legs_per_set from phases submitted by the wizard
- Plan 04-04 (phase tier migration) is unaffected — group phases and elimination tiers are separate concerns
- The full save-and-persist pipeline is complete: wizard captures values → insertPhases stores them → launch reads them for match generation

---
*Phase: 04-launch-and-match-generation*
*Completed: 2026-04-02*
