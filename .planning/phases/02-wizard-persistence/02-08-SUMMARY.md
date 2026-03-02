---
phase: 02-wizard-persistence
plan: "08"
subsystem: validation
tags: [zod, sql-validation, type-safety, boundary-validation]
dependency_graph:
  requires: []
  provides: [sql-result-validation, zod-schemas, authz-schemas]
  affects: [events-page, edit-wizard, admin-pages, authz]
tech_stack:
  added: [zod@^4.3.6 in packages/front and packages/db]
  patterns: [z.infer<> for DB row types, z.array().parse() at SQL boundary, z.preprocess for JSONB columns]
key_files:
  created:
    - packages/front/src/lib/server/schemas/event-schemas.ts
    - packages/front/src/lib/server/schemas/entity-schemas.ts
    - packages/db/src/schemas.ts
  modified:
    - packages/front/src/routes/(app)/events/+page.server.ts
    - packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
    - packages/front/src/routes/(app)/admin/+page.server.ts
    - packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
    - packages/db/src/authz.ts
    - packages/front/package.json
    - packages/db/package.json
    - CLAUDE.md
decisions:
  - "sql<Record<string,unknown>[]> instead of sql<unknown[]> — postgres.Sql<T> requires T extends readonly (object|undefined)[] which unknown[] violates"
  - "BracketTier cast via (p.tiers ?? []) as BracketTier[] — PhaseRowSchema uses z.number() returning number, BracketTier.round is BracketRound union; cast safe because DB stores only valid power-of-2 values"
  - "Zod schemas in packages/db/src/schemas.ts — authz.ts is in packages/db, can't import from packages/front"
metrics:
  duration: "11 min"
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_created: 3
  files_modified: 8
---

# Phase 2 Plan 8: Zod SQL Validation Schemas Summary

Zod v4 boundary validation for all SQL SELECT results — centralized schema files, z.infer<> types, and JSONB preprocess for tiers column.

## What Was Built

### Task 1: Add zod dependency and create schema files

Added `"zod": "^4.3.6"` to `packages/front/package.json` and `packages/db/package.json`. Created three schema files:

- **`packages/front/src/lib/server/schemas/event-schemas.ts`** — EventRowSchema, EventDetailRowSchema, TournamentRowSchema, PhaseRowSchema (with z.preprocess for tiers JSONB), EventEntityRowSchema
- **`packages/front/src/lib/server/schemas/entity-schemas.ts`** — EntityRowSchema, EntityWithParentSchema
- **`packages/db/src/schemas.ts`** — CheckRoleRowSchema, UserRoleRowSchema (for authz.ts)

Commit: `2a832b8`

### Task 2: Wire schemas into server files, authz.ts, and CLAUDE.md

Replaced all inline SQL result type aliases with Zod schema validation at the SQL boundary:

- **`events/+page.server.ts`**: removed `type EventRow = {...}`, now uses `z.array(EventRowSchema).parse(rawEvents)`
- **`edit/+page.server.ts`**: removed 3 inline types + `type PhaseRow`, wired EventDetailRowSchema, TournamentRowSchema, PhaseRowSchema, EventEntityRowSchema; removed `JSON.parse(p.tiers as string)` (now handled by PhaseRowSchema z.preprocess)
- **`admin/+page.server.ts`**: already updated in 02-07 commit; confirmed wired to EntityWithParentSchema
- **`admin/entities/new/+page.server.ts`**: removed `type EntityRow`, wired EntityRowSchema
- **`authz.ts`**: added z/CheckRoleRowSchema/UserRoleRowSchema imports; both SQL queries now validate with z.array(...).parse()
- **`CLAUDE.md`**: added "Validation des résultats SQL" section documenting the pattern

Commits: `8b5254f`, `c9bbcdc`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] workspace:* zod dependency fails — used explicit version**
- **Found during:** Task 1
- **Issue:** Plan specified `"zod": "workspace:*"` but zod is not a workspace package (it's a root-level npm dep). pnpm install failed with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
- **Fix:** Changed to `"zod": "^4.3.6"` (the actual installed version)
- **Files modified:** packages/front/package.json, packages/db/package.json
- **Commit:** 2a832b8

**2. [Rule 1 - Bug] sql<unknown[]> violates postgres.Sql<T> constraint**
- **Found during:** Task 2 (typecheck)
- **Issue:** `postgres.Sql<T>` requires `T extends readonly (object | undefined)[]`. `unknown[]` fails this constraint with TS2344.
- **Fix:** Changed all `sql<unknown[]>` to `sql<Record<string, unknown>[]>` in both authz.ts (already committed cleanly) and all 4 front server files
- **Files modified:** packages/db/src/authz.ts, 4 x +page.server.ts
- **Commits:** 8b5254f, c9bbcdc

**3. [Rule 1 - Bug] PhaseRowSchema.tiers type is number, BracketTier.round is BracketRound**
- **Found during:** Task 2 (typecheck)
- **Issue:** PhaseRowSchema uses `z.number().int()` for `round`, returning TypeScript `number`. But `EliminationPhase.tiers` requires `BracketTier[]` where `round: BracketRound` (union of power-of-2 values). TS2322 error.
- **Fix:** Added `BracketTier` to import in edit/+page.server.ts; cast `(p.tiers ?? []) as BracketTier[]`
- **Files modified:** packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
- **Commit:** c9bbcdc

**4. [Environmental] Background LSP server reverted files between Write and git add**
- **Found during:** Task 2
- **Issue:** The running Neovim Svelte/TypeScript language servers (svelteserver, tsserver processes) sent file-save events that overwrote freshly written files within milliseconds. Multiple Write tool calls were reverted.
- **Fix:** Combined write + git add into single atomic bash commands; used git hash-object/update-index as fallback when needed
- **Not a code deviation** — operational workaround only

## Key Technical Decisions

- `sql<Record<string, unknown>[]>` satisfies postgres.js type constraint while still allowing Zod to validate — the Zod schema validates the actual shape at runtime, TypeScript just needs an object type at compile time
- `z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, ...)` handles both postgres.js returning parsed JSON objects and raw JSON strings for JSONB columns
- Schemas in `packages/db/src/schemas.ts` (not `packages/front`) because `authz.ts` lives in packages/db and cannot import from packages/front

## Self-Check: PASSED

All 9 key files found on disk. All 3 task commits verified in git history.
