---
phase: 01-foundation
plan: "05"
subsystem: authorization
tags: [authz, roles, sql-migration, better-auth]
dependency_graph:
  requires: [01-01, 01-02, 01-03, 01-04]
  provides: [user_entity_role table, custom authz layer]
  affects: [packages/db, packages/front auth guards]
tech_stack:
  added: [entity_role ENUM, user_entity_role table]
  patterns: [factory function injection (createAuthz(sql)), scoped entity roles]
key_files:
  created:
    - packages/db/src/schema/004_user_entity_role.sql
    - packages/db/src/schema/005_drop_role_column.sql
    - packages/db/src/authz.ts
  modified:
    - packages/db/src/auth.ts
    - packages/db/src/index.ts
    - packages/db/src/schema/003_seed_dev.sql
decisions:
  - createAuthz(sql) factory pattern — matches codebase createAuth/createSql convention; sql is injected, not a module singleton
  - checkRole/getUserRoles/canPromote returned from factory, not exported as top-level functions
  - adminFederal can promote on any entity (global override)
metrics:
  duration: "5 min"
  completed: "2026-03-01"
  tasks: 3
  files: 6
---

# Phase 1 Plan 5: Custom Authorization Layer (user_entity_role) Summary

**One-liner:** Scoped entity roles via `user_entity_role` table replacing Better Auth global `role` column, with `createAuthz(sql)` factory exporting `checkRole/getUserRoles/canPromote`.

## What Was Built

Replaced the Better Auth admin plugin (global `role` column on `user` table) with a proper entity-scoped authorization model:

- **004_user_entity_role.sql**: Creates `entity_role` ENUM and `user_entity_role(user_id, entity_id, role)` table with composite PK and indexes
- **005_drop_role_column.sql**: Drops the `role` column from the `user` table (Better Auth admin plugin column)
- **authz.ts**: `createAuthz(sql)` factory returning `checkRole`, `getUserRoles`, `canPromote` with full TypeScript types
- **auth.ts**: Removed `adminPlugin` import and usage; only `sveltekitCookies` remains in plugins array
- **003_seed_dev.sql**: Added `INSERT INTO user_entity_role` for `federal`, `orga`, and `admin` test users with real UUIDs
- **index.ts**: Re-exports `createAuthz` and `EntityRole` type

## Authorization Model

Roles (lowest to highest): `organisateur < adminTournoi < adminClub < adminComite < adminLigue < adminFederal`

- `joueur` is implicit for all authenticated users — NOT stored in `user_entity_role`
- Each role is explicit and scoped to a specific entity
- `adminFederal` can promote on any entity (global override)
- A promoter can assign roles up to their own level on entities where they hold that level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted authz.ts to use factory pattern instead of module-level sql import**

- **Found during:** Task 2 typecheck
- **Issue:** Plan specified `import { sql } from "./client.js"` but `client.ts` exports `createSql(url)` factory (no module-level `sql` singleton) — consistent with the `createAuth(sql, config)` pattern established in plan 01-01
- **Fix:** Changed `authz.ts` to export `createAuthz(sql: postgres.Sql)` factory returning the three functions; updated `index.ts` to export `createAuthz` instead of individual functions
- **Files modified:** `packages/db/src/authz.ts`, `packages/db/src/index.ts`
- **Commit:** 923684d

## Self-Check: PASSED

- packages/db/src/schema/004_user_entity_role.sql: FOUND
- packages/db/src/schema/005_drop_role_column.sql: FOUND
- packages/db/src/authz.ts: FOUND
- packages/db/src/auth.ts: adminPlugin removed (0 occurrences)
- packages/db/src/index.ts: createAuthz and EntityRole exported
- pnpm typecheck: PASSED
