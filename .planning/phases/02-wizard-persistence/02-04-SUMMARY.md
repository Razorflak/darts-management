---
phase: 02-wizard-persistence
plan: 04
subsystem: frontend-wizard
tags: [svelte, wizard, events, persistence, navigation]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [functional-wizard-at-events-new]
  affects: [frontend-routing, navbar, event-creation-flow]
tech_stack:
  added: []
  patterns:
    - eventId tracking for CREATE vs UPDATE (null = first save, set after first success)
    - publishError prop pattern for inline fetch error display in Svelte components
    - entities prop replacing hardcoded mock data in EventStep
key_files:
  created:
    - packages/front/src/routes/(app)/events/new/+page.svelte
  modified:
    - packages/front/src/lib/tournament/components/EventStep.svelte
    - packages/front/src/lib/tournament/components/TournamentForm.svelte
    - packages/front/src/lib/tournament/components/PublishStep.svelte
    - packages/front/src/routes/(app)/+layout.svelte
  deleted:
    - packages/front/src/routes/tournaments/new/+page.svelte
decisions:
  - publishError typed as string|undefined in PublishStep prop (not null) to match optional prop convention; page.svelte uses null ?? undefined coercion
  - Old /tournaments/new route deleted immediately (Rule 3) to unblock typecheck — it was failing because EventStep now requires entities prop
metrics:
  duration: "3 min"
  completed_date: "2026-03-01"
  tasks_completed: 3
  files_created: 1
  files_modified: 4
  files_deleted: 1
---

# Phase 02 Plan 04: Wizard Migration to /events/new Summary

**One-liner:** Functional event wizard at /events/new with real entity data, save/publish fetch wiring, and navbar link replacing the /tournaments/new stub.

## What Was Built

Migrated the tournament creation wizard from the static `/tournaments/new` prototype to the real `/events/new` route with full persistence wiring. The wizard now:

- Loads real entity data from the DB (via `+page.server.ts` from plan 02-02)
- Saves drafts to PostgreSQL via `fetch POST /events/new/save`
- Tracks `eventId` after first save so subsequent saves call UPDATE not INSERT
- Publishes events via `fetch POST /events/new/publish` with redirect to `/events` on success
- Shows inline errors on both save and publish failures (no browser alerts)
- The navbar has an "Événements" link to `/events`
- The old `/tournaments/new` route is deleted (returns 404)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update EventStep and TournamentForm | 253d7f0 | EventStep.svelte, TournamentForm.svelte |
| 2 | Update PublishStep + create wizard page | 18a874c | PublishStep.svelte, events/new/+page.svelte |
| 3 | Navbar link + delete old route | 9129b1d | +layout.svelte, -tournaments/new/+page.svelte |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted old route during Task 1 to unblock typecheck**
- **Found during:** Task 1
- **Issue:** Adding the required `entities` prop to EventStep broke the type check in `/tournaments/new/+page.svelte` which still called EventStep without `entities`. This caused `svelte-check` to fail, blocking the Task 1 done criteria.
- **Fix:** Deleted `/packages/front/src/routes/tournaments/new/+page.svelte` immediately. Task 3 still added the navbar link as planned.
- **Files modified:** Removed `packages/front/src/routes/tournaments/new/+page.svelte`
- **Commit:** 253d7f0 (included in Task 1 commit)

**2. [Rule 1 - Bug] Fixed type mismatch on publishError prop**
- **Found during:** Task 2
- **Issue:** `publishError` state was `string | null` but `PublishStep` prop was `string | undefined`. Svelte type check rejected `null` as not assignable to `string | undefined`.
- **Fix:** Pass `publishError ?? undefined` in the template instead of `{publishError}` shorthand.
- **Files modified:** `packages/front/src/routes/(app)/events/new/+page.svelte`
- **Commit:** 18a874c

## Self-Check: PASSED

All files verified present. All commits verified in git log:
- 253d7f0: feat(02-04): update EventStep and TournamentForm components
- 18a874c: feat(02-04): update PublishStep and create wizard page at /events/new
- 9129b1d: feat(02-04): add Événements navbar link and delete old tournaments/new route
