---
phase: 01-foundation
plan: "04"
subsystem: ui
tags: [sveltekit, flowbite-svelte, better-auth, rbac, entity, admin, svelte5]

# Dependency graph
requires:
  - phase: 01-01
    provides: "packages/db exports auth (Better Auth) and sql (postgres.js) — entity table and PARENT_TYPE hierarchy"
  - phase: 01-02
    provides: "SvelteKit hooks populating locals.user, (app) route group with redirect guard"
provides:
  - "/admin page: flat entity list grouped by type (federation/ligue/comite/club) — admin_federal only"
  - "/admin/entities/new page: creation form with reactive parent selector filtered by hierarchy"
  - "Server-side enforcement of entity parent requirements (both validation AND DB constraint)"
  - "Permission check pattern: auth.api.userHasPermission with entity:create resource"
affects:
  - all subsequent phases that need organisateur entity selection (ORG-03 foundation)
  - future admin pages under (app)/admin/

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Permission gate: auth.api.userHasPermission({ body: { userId, permissions: { entity: ['create'] } } }) in +page.server.ts load AND action"
    - "Server action validation mirrors DB CHECK constraint (defense in depth)"
    - "$effect.pre() for form repopulation from server action response — avoids Svelte 5 state_referenced_locally warning"
    - "Alert icon with Svelte 5 snippet syntax: {#snippet icon()}...{/snippet} (not slot='icon')"

key-files:
  created:
    - "packages/front/src/routes/(app)/admin/+page.server.ts"
    - "packages/front/src/routes/(app)/admin/+page.svelte"
    - "packages/front/src/routes/(app)/admin/entities/new/+page.server.ts"
    - "packages/front/src/routes/(app)/admin/entities/new/+page.svelte"
  modified: []

key-decisions:
  - "$effect.pre() for form repopulation: $state(form?.type) triggers Svelte 5 state_referenced_locally warning — $effect.pre() is the idiomatic fix"
  - "Load all entities for parent selector, filter client-side: simpler than fetching by type on type-select change (no server round-trip)"
  - "Permission checked in both load and action: belt-and-suspenders for direct POST bypass attempts"

patterns-established:
  - "Pattern: Admin route guard in page.server.ts load — 403 on missing entity:create permission (not in layout only)"
  - "Pattern: Form repopulation via $effect.pre() — correct Svelte 5 way to sync reactive prop into mutable $state"

requirements-completed: [ORG-01, ORG-02, ORG-03]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 1 Plan 04: Entity Administration UI Summary

**Admin entity list grouped by type and creation form enforcing federation/ligue/comite/club hierarchy, accessible to admin_federal only via entity:create permission check**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T19:36:10Z
- **Completed:** 2026-02-28T19:39:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- /admin page queries all entities with parent name via LEFT JOIN, groups by type (federation/ligue/comite/club), renders Flowbite tables with badge headings — only accessible to users with entity:create permission (403 for others)
- /admin/entities/new form: type selector drives reactive parent options filtered by PARENT_TYPE hierarchy; server action validates parent constraint before INSERT; redirects to /admin on success
- Defense-in-depth: server validation of parent requirement mirrors DB CHECK constraint from migration 002; permission checked in both load and action functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Entity list page (admin dashboard)** - `3737e65` (feat)
2. **Task 2: Entity creation form** - `459b535` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `packages/front/src/routes/(app)/admin/+page.server.ts` - Load: entity:create permission check, SELECT all entities with parent name, grouped by type
- `packages/front/src/routes/(app)/admin/+page.svelte` - Entity list grouped by type in Flowbite tables; Badge headings; "Nouvelle entité" button
- `packages/front/src/routes/(app)/admin/entities/new/+page.server.ts` - Load: all entities for parent selector. Action: validate name/type/parent hierarchy, INSERT INTO entity, redirect
- `packages/front/src/routes/(app)/admin/entities/new/+page.svelte` - Type selector drives reactive parent options; $effect.pre for form repopulation; Alert for missing parents

## Decisions Made

- **$effect.pre() for form repopulation:** Initializing `$state` from a reactive prop (`form?.type`) triggers Svelte 5 `state_referenced_locally` warning. Using `$effect.pre(() => { if (form?.type) selectedType = form.type })` is the idiomatic fix — runs synchronously before DOM updates, correctly repopulates the type selector after a server action error.
- **Load all entities, filter client-side:** Fetching all entities once and filtering by `requiredParentType` in `$derived` avoids a server round-trip on each type selection change. For small entity counts (federation/ligue numbers), this is correct.
- **Permission checked in both load and action:** Prevents direct POST bypasses — an attacker could POST to /admin/entities/new?/default without visiting the page, bypassing a load-only check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Svelte 5 state_referenced_locally warning on form?.type initialization**

- **Found during:** Task 2 (Entity creation form)
- **Issue:** `let selectedType = $state(form?.type ?? "")` triggered Svelte 5 warning: "This reference only captures the initial value of form. Did you mean to reference it inside a closure instead?" — `form` is a reactive `$props()` value; referencing it directly in `$state()` is flagged.
- **Fix:** Changed to `let selectedType = $state("")` plus `$effect.pre(() => { if (form?.type) selectedType = form.type })` — runs before DOM render, correctly syncs the initial form value without triggering the warning.
- **Files modified:** `packages/front/src/routes/(app)/admin/entities/new/+page.svelte`
- **Verification:** `pnpm --filter front check` passes with 0 errors, 0 warnings.
- **Committed in:** `459b535` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — Svelte 5 reactive pattern)
**Impact on plan:** Fix necessary for clean svelte-check output. Behavior identical; only the reactive initialization pattern changed.

## Issues Encountered

- Svelte 5 `$state` initialization from reactive props has a different pattern than Svelte 4. The `$effect.pre()` approach is the idiomatic Svelte 5 way to handle "initialize mutable state from a prop, but allow user mutation". This was not anticipated in the plan but is a minor and well-understood pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /admin and /admin/entities/new are functional — admin_federal users can create the full entity hierarchy
- ORG-01 (create entities) and ORG-02 (hierarchy enforced) are complete
- ORG-03 foundation laid: organisateur entity selection will use the same entity table in Phase 2
- Phase 1 (Foundation) is now complete — all 4 plans executed

---
*Phase: 01-foundation*
*Completed: 2026-02-28*

## Self-Check: PASSED

All claimed files exist and all task commits verified:
- FOUND: packages/front/src/routes/(app)/admin/+page.server.ts
- FOUND: packages/front/src/routes/(app)/admin/+page.svelte
- FOUND: packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
- FOUND: packages/front/src/routes/(app)/admin/entities/new/+page.svelte
- FOUND: .planning/phases/01-foundation/01-04-SUMMARY.md
- COMMIT 3737e65: feat(01-04): add admin entity list page
- COMMIT 459b535: feat(01-04): add entity creation form with parent hierarchy enforcement
