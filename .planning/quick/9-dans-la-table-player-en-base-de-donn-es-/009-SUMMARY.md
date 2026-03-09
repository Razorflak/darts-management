---
phase: quick-9
plan: "009"
subsystem: player-data
tags: [nullable, migration, zod, birth-date]
dependency_graph:
  requires: []
  provides: [nullable-birth-date]
  affects: [player-registration, admin-register, partner-creation, hooks-auto-create]
tech_stack:
  added: []
  patterns: [zod-nullable, sql-migration-alter-column]
key_files:
  created:
    - packages/db/src/schema/015_player_birth_date_nullable.sql
  modified:
    - packages/front/src/lib/server/schemas/event-schemas.ts
    - packages/front/src/hooks.server.ts
    - packages/front/src/routes/players/+server.ts
    - packages/front/src/routes/(app)/events/[id]/register/+server.ts
    - packages/front/src/routes/tournaments/[id]/admin/register/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
decisions:
  - "birth_date nullable in DB allows NULL instead of '1900-01-01' sentinel for unknown dates"
  - "PlayerSchema.birth_date: z.string().nullable() — birth_date::text cast already returns NULL as null from postgres"
metrics:
  duration: "4 min"
  completed: "2026-03-09"
  tasks: 2
  files: 7
---

# Phase quick-9 Plan 009: Make player.birth_date nullable Summary

**One-liner:** Remove `NOT NULL` constraint on `player.birth_date` and eliminate `'1900-01-01'` placeholder — birth dates for unknown players now stored as `NULL`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration SQL — rendre birth_date nullable | 16cc9d8 | packages/db/src/schema/015_player_birth_date_nullable.sql |
| 2 | Schemas Zod et code serveur — birth_date nullable | 21e7578 | 6 files |

## Decisions Made

- `birth_date` column: `ALTER TABLE player ALTER COLUMN birth_date DROP NOT NULL` — simplest migration, no data loss
- Zod schemas `PlayerSchema` and `PlayerSearchResultSchema`: `z.string().nullable()` — the `::text` cast already returns `null` for NULL DB values, Zod simply needs to accept it
- `hooks.server.ts` auto-create: INSERT without `birth_date` column entirely — cleaner than passing `null` explicitly
- `routes/players/+server.ts`: `birthDate = raw.birth_date ?? null` — falls through to postgres null naturally
- Admin register endpoints: `birth_date` made optional (`.optional()`) and `?? null` fallback — admin can still provide a date when known

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Admin tournament roster register endpoint also had birth_date**

- **Found during:** Task 2
- **Issue:** `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts` also inserted players with `birth_date` — was already partially modified from quick-7 (semicolon removal), and the birth_date removal aligned with our task goal
- **Fix:** Staged the already-correct changes (birth_date removed from PlayerSlotSchema, AdminRegisterSchema, and INSERT statements) as part of the task 2 commit
- **Files modified:** `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts`
- **Commit:** 21e7578

### Pre-existing Issues (Deferred)

- `src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte` line 83: Type error `string` not assignable to status enum — pre-existing, unrelated to this task, deferred

## Self-Check

- [x] `grep -r "1900-01-01" packages/front/src/` — 0 results
- [x] `psql ... "\d player" | grep birth_date` — no "not null" in output
- [x] Both commits exist: 16cc9d8, 21e7578
- [x] 015_player_birth_date_nullable.sql created and applied

## Self-Check: PASSED
