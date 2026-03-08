---
phase: 03-player-registration
plan: "04"
subsystem: tournament-status
tags:
  - migration
  - tournament
  - check-in
  - admin-ui
dependency_graph:
  requires:
    - 03-03
  provides:
    - tournament.status column (migration 014)
    - AdminEventDetailSchema
    - /admin/events/[id] page
  affects:
    - register endpoint (check-in status)
    - TournamentForm wizard (check_in_required toggle)
    - save endpoint (check_in_required persisted)
tech_stack:
  added: []
  patterns:
    - AdminEventDetailSchema Zod-first domain schema
    - tournament status lifecycle (ready / check-in / started / finished)
key_files:
  created:
    - packages/db/src/schema/014_tournament_status.sql
    - packages/front/src/routes/(admin)/admin/events/[id]/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/+page.svelte
  modified:
    - packages/front/src/lib/server/schemas/event-schemas.ts
    - packages/front/src/lib/tournament/components/TournamentForm.svelte
    - packages/front/src/routes/(admin)/admin/events/new/save/+server.ts
    - packages/front/src/routes/(app)/events/[id]/register/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.server.ts
    - packages/front/src/routes/tournaments/[id]/admin/+page.server.ts
    - packages/front/src/lib/tournament/utils.ts
    - packages/front/src/lib/tournament/templates.ts
decisions:
  - "Tournament status enum is [ready, check-in, started, finished] — no draft (events have draft, tournaments do not)"
  - "AdminEventDetailSchema defined in event-schemas.ts per Zod-first rule, not inline in route"
  - "Registration allowed when t.status IN ('ready', 'check-in') AND e.status = 'ready'"
metrics:
  duration: "~12 min"
  completed: "2026-03-08"
  tasks_completed: 3
  files_changed: 11
---

# Phase 03 Plan 04: Tournament Status Column + check_in_required + Admin Event Detail Page Summary

Tournament status lifecycle column added via migration 014, check_in_required wired through wizard/save/register, admin event detail page created at /admin/events/[id] showing tournament list with roster links.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Migration 014 — tournament.status column + AdminTournamentSchema update | 3f17cfc | 014_tournament_status.sql, event-schemas.ts, /tournaments/[id]/admin/+page.server.ts |
| 2 | check_in_required in wizard + save endpoint + register endpoint | aa37edd | event-schemas.ts, TournamentForm.svelte, save/+server.ts, register/+server.ts, edit/+page.server.ts, utils.ts, templates.ts |
| 3 | Admin event detail page /admin/events/[id] | e0d59db | event-schemas.ts, +page.server.ts, +page.svelte |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing check_in_required in templates.ts tournament objects**
- **Found during:** Task 2
- **Issue:** Adding check_in_required to TournamentSchema broke 11 tournament objects in templates.ts (required field now missing)
- **Fix:** Added check_in_required: false to all tournament objects in both EVENT_TEMPLATES
- **Files modified:** packages/front/src/lib/tournament/templates.ts
- **Commit:** aa37edd

**2. [Rule 1 - Bug] Fixed missing check_in_required in createBlankTournament()**
- **Found during:** Task 2
- **Issue:** createBlankTournament() in utils.ts returned object missing check_in_required (now required by DraftTournamentSchema)
- **Fix:** Added check_in_required: false to the returned object
- **Files modified:** packages/front/src/lib/tournament/utils.ts
- **Commit:** aa37edd

**3. [Rule 1 - Bug] Fixed pre-existing TournamentForm.svelte onchange type error**
- **Found during:** Task 2 typecheck
- **Issue:** e.target possibly null and EventTarget has no .value property — blocked typecheck from passing
- **Fix:** Cast to (e.target as HTMLSelectElement).value
- **Files modified:** packages/front/src/lib/tournament/components/TournamentForm.svelte
- **Commit:** aa37edd

**4. [Rule 3 - Blocker] pgmigrations table out of sync — migration 013 applied manually without record**
- **Found during:** Task 1 migration
- **Issue:** node-pg-migrate tried to run 013_teams which already existed in DB, failing with "column department already exists"
- **Fix:** Inserted 013_teams into pgmigrations table to mark it as already applied, then ran 014
- **Commit:** N/A (DB-level fix, no code change)

**5. [Rule 1 - Style] Applied Biome then Prettier formatting on all modified files**
- **Found during:** Lint verification
- **Issue:** Lint (Prettier --check) failed on pre-existing 45+ files; my new files needed Prettier formatting
- **Fix:** Applied npx prettier --write on all 10 modified files; pre-existing failures in untouched files are out of scope

## Self-Check: PASSED

All created files exist. All task commits exist:
- 3f17cfc: migration 014 + AdminTournamentSchema update
- aa37edd: check_in_required in wizard/save/register
- e0d59db: admin event detail page
