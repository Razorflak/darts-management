---
phase: 01-foundation
plan: "06"
subsystem: authorization
tags: [authz, roles, svelte, sveltekit, better-auth, admin-guard]

requires:
  - phase: 01-05
    provides: createAuthz factory with getUserRoles/checkRole/canPromote bound to postgres sql

provides:
  - $lib/server/authz.ts singleton exposing getUserRoles/checkRole/canPromote
  - admin/+page.server.ts guard using getUserRoles instead of auth.api.userHasPermission
  - admin/entities/new/+page.server.ts guard in load and action using getUserRoles
  - +layout.server.ts returning hasAdminAccess computed from getUserRoles
  - +layout.svelte navbar conditioned on data.hasAdminAccess (server-side)
  - auth-client.ts without adminClient plugin

affects: [admin routes, layout, frontend auth]

tech-stack:
  added: []
  patterns:
    - "$lib/server/authz.ts: createAuthz(sql) pre-bound at module level, re-exports getUserRoles/checkRole/canPromote"
    - "Permission check in both load AND action (belt-and-suspenders per phase decisions)"
    - "hasAdminAccess computed server-side in layout load, not client-derived from user.role"

key-files:
  created:
    - packages/front/src/lib/server/authz.ts
  modified:
    - packages/front/src/routes/(app)/admin/+page.server.ts
    - packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
    - packages/front/src/routes/(app)/+layout.server.ts
    - packages/front/src/routes/(app)/+layout.svelte
    - packages/front/src/lib/auth-client.ts

key-decisions:
  - "$lib/server/authz.ts wraps createAuthz(sql) — pre-binds to the sql singleton so callers import getUserRoles directly without repeating factory call"
  - "hasAdminAccess includes adminFederal, adminLigue, adminComite, adminClub — all structural admins see the Admin link, not just adminFederal"
  - "auth-client.ts stripped of adminClient() — plugin removed server-side in 01-05, client plugin was dead code"

patterns-established:
  - "Server-side role check: import { getUserRoles } from '$lib/server/authz', check role array, throw error(403)"
  - "Layout data pattern: compute access flags in +layout.server.ts, consume as data.hasAdminAccess in +layout.svelte"

requirements-completed: [AUTH-04, ORG-01, ORG-02, ORG-03]

duration: 2min
completed: 2026-03-01
---

# Phase 1 Plan 6: Frontend Admin Guard Migration Summary

**Admin permission guards rewritten from `auth.api.userHasPermission` to `getUserRoles` from the custom authz module, with server-side `hasAdminAccess` replacing client-side role derivation in the navbar.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-01T09:17:28Z
- **Completed:** 2026-03-01T09:19:28Z
- **Tasks:** 2
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments

- All `auth.api.userHasPermission` calls removed from the frontend (0 remaining)
- `adminClient()` plugin removed from `auth-client.ts` (was dead code since plan 01-05 removed server plugin)
- Admin guards in both `load` and `actions` use `getUserRoles` from the new authz module
- Layout server computes `hasAdminAccess` server-side and passes it to Svelte layout
- Navbar "Administration" link now conditioned on `data.hasAdminAccess` (server truth, not client-derived)
- `svelte-check` passes with 0 errors, 0 warnings across 2309 files

## Task Commits

1. **Task 1: Réécrire les gardes admin** - `46bc4dd` (feat)
2. **Task 2: Layout server + navbar admin conditionnel** - `ca1b2ed` (feat)

## Files Created/Modified

- `packages/front/src/lib/server/authz.ts` — Created: wraps `createAuthz(sql)` factory, exports pre-bound `getUserRoles`, `checkRole`, `canPromote`
- `packages/front/src/routes/(app)/admin/+page.server.ts` — Guard rewritten: uses `getUserRoles` + `isAdminFederal` check
- `packages/front/src/routes/(app)/admin/entities/new/+page.server.ts` — Guard rewritten in `load` and `actions.default`
- `packages/front/src/routes/(app)/+layout.server.ts` — Adds `getUserRoles` call, computes `hasAdminAccess`, returns it in load data
- `packages/front/src/routes/(app)/+layout.svelte` — Replaces `isAdmin` derived state with `{#if data.hasAdminAccess}`; removes `adminRoles` constant
- `packages/front/src/lib/auth-client.ts` — Removes `adminClient()` import and plugin registration

## Decisions Made

- Created `$lib/server/authz.ts` as a thin wrapper that pre-binds `createAuthz(sql)` at module load, so all server files can `import { getUserRoles } from "$lib/server/authz"` without repeating the factory call pattern. This mirrors how `$lib/server/db.ts` exports a pre-bound `sql` instance.
- `hasAdminAccess` in the layout includes `adminFederal`, `adminLigue`, `adminComite`, `adminClub` — all four structural admin roles see the Admin navigation link (plan specified `adminFederal` only for the guard page, but broader access for navbar visibility is appropriate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Created $lib/server/authz.ts wrapper instead of importing getUserRoles directly from @darts-management/db**

- **Found during:** Task 1 (reading authz module)
- **Issue:** The plan's context showed `import { getUserRoles } from "@darts-management/db"` but `packages/db/src/index.ts` only exports `createAuthz` factory — `getUserRoles` is not a top-level export. This is the factory pattern deviation documented in plan 01-05.
- **Fix:** Created `$lib/server/authz.ts` that calls `createAuthz(sql)` once at module level and re-exports the three functions, matching the established `$lib/server/db.ts` singleton pattern.
- **Files modified:** `packages/front/src/lib/server/authz.ts` (new file)
- **Verification:** `svelte-check` passes, no TypeScript errors
- **Committed in:** `46bc4dd` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/mismatch between plan interface and actual implementation)
**Impact on plan:** Necessary adaptation — the factory pattern was established in 01-05. The wrapper approach is cleaner than inlining factory calls in every route file.

## Issues Encountered

None beyond the factory pattern adaptation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All frontend admin guards now use the custom authz module (`user_entity_role` table)
- Zero references to `auth.api.userHasPermission` or `adminClient` remain in the codebase
- Foundation (Phase 1) is fully complete — auth, entities, roles, and authorization guards all in place
- Ready to proceed to Phase 2 (tournaments / match generation)

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
