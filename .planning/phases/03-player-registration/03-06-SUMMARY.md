---
phase: 03-player-registration
plan: "06"
subsystem: ui
tags: [svelte, sveltekit, postgres, zod, checkin, flowbite]

# Dependency graph
requires:
  - phase: 03-05
    provides: admin roster page with check-in, status management, player add/remove
provides:
  - Cross-tournament check-in page /admin/events/[id]/checkin?date= with progress bar, search, filter, per-player buttons
  - PATCH /admin/events/[id]/day-checkin — batch-transitions ready tournaments to check-in
  - PATCH /admin/events/[id]/checkin/team-checkin — sets checked_in on registration rows
  - CheckinRegistrationModal — inline registration with immediate check-in on the checkin page
  - CheckinRegistrationSchema, CheckinPlayerSchema, CheckinDaySchema in event-schemas.ts
  - register endpoint /api/tournament/register now returns registration_id (RETURNING id)
affects:
  - phase-04-bracket-generation
  - any feature that reads tournament check-in status

# Tech tracking
tech-stack:
  added: []
  patterns:
    - syncPartners() pattern for doubles — propagates checked_in to all players sharing a registration_id without page reload
    - Day-grouping from start_at — tournaments grouped by start_at::date::text in server load, CheckinDaySchema
    - Client-side transactional registration — collect registration_ids, check-in all at once, rollback on failure

key-files:
  created:
    - packages/front/src/routes/(admin)/admin/events/[id]/day-checkin/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/checkin/CheckinRegistrationModal.svelte
    - packages/front/src/routes/(admin)/admin/events/[id]/checkin/team-checkin/+server.ts
  modified:
    - packages/front/src/lib/server/schemas/event-schemas.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/+page.svelte
    - packages/front/src/routes/api/tournament/register/+server.ts

key-decisions:
  - "[03-06]: team-checkin PATCH checks status = 'check-in' guard — prevents accidental check-in on non-active tournaments"
  - "[03-06]: syncPartners() loops all players scanning registration_id — O(n*m) but n is bounded by event size, acceptable"
  - "[03-06]: CheckinRegistrationModal uses /api/tournament/register (existing endpoint) not a new per-tournament admin endpoint — avoids endpoint proliferation"
  - "[03-06]: register endpoint RETURNING id — fully backwards-compatible, callers that ignore response body are unaffected"
  - "[03-06]: Rollback uses /api/tournament/unregister with registration_id — clean because we have registration_id from RETURNING"

patterns-established:
  - "RETURNING id on INSERT — all registration inserts now return registration_id for caller use"
  - "Day-scope check-in — tournaments grouped by start_at::date, page scoped to single date via ?date= param"

requirements-completed:
  - PLAYER-02
  - PLAYER-03

# Metrics
duration: 7min
completed: 2026-03-30
---

# Phase 03 Plan 06: Cross-Tournament Check-in Flow Summary

**Day-scoped cross-tournament check-in page with batch status transition, doubles partner sync, and inline registration+check-in modal**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-30T07:35:34Z
- **Completed:** 2026-03-30T07:42:53Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Admin event page now shows "Check-in [date]" buttons for each competition day (tournaments grouped by start_at), with confirmation dialog before transitioning
- Full cross-tournament check-in page at `/admin/events/[id]/checkin?date=` with progress bar, name search, unchecked-only filter, per-tournament toggle buttons, bulk "Check-in tous" per player
- Doubles partner sync via `syncPartners()` — when one partner is checked in, the other's row updates instantly without a page reload
- `CheckinRegistrationModal` allows inline registration from the check-in page with immediate check-in (PATCH team-checkin after successful registrations), client-side rollback on partial failure
- `/api/tournament/register` now returns `{ ok: true, registration_id }` via `RETURNING id`

## Task Commits

1. **Task 1: Schemas + day-checkin endpoint + admin event day buttons** - `f239b28` (feat)
2. **Task 2: Checkin page + team-checkin endpoint** - `37f265a` (feat)
3. **Task 3: Register endpoint RETURNING id + CheckinRegistrationModal** - `48d23b8` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `packages/front/src/lib/server/schemas/event-schemas.ts` — added CheckinRegistrationSchema, CheckinPlayerSchema, CheckinDaySchema
- `packages/front/src/routes/(admin)/admin/events/[id]/+page.server.ts` — add start_at to tournament SELECT, compute checkinDays, remove console.log
- `packages/front/src/routes/(admin)/admin/events/[id]/+page.svelte` — day check-in buttons section above tournament table
- `packages/front/src/routes/(admin)/admin/events/[id]/day-checkin/+server.ts` — PATCH endpoint batch-transitions ready tournaments to check-in
- `packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.server.ts` — loads players grouped by player_id with per-tournament registrations
- `packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.svelte` — full check-in UI with progress, search, filters, syncPartners
- `packages/front/src/routes/(admin)/admin/events/[id]/checkin/team-checkin/+server.ts` — PATCH sets checked_in on registration rows (check-in scoped)
- `packages/front/src/routes/(admin)/admin/events/[id]/checkin/CheckinRegistrationModal.svelte` — inline modal: player search + creation, tournament checkboxes, immediate check-in on success, rollback on failure
- `packages/front/src/routes/api/tournament/register/+server.ts` — INSERT RETURNING id, response includes registration_id

## Decisions Made
- Used existing `/api/tournament/register` in CheckinRegistrationModal instead of creating a new per-tournament admin endpoint — avoids proliferation, format `{ tournament_id, team: [...] }` is flexible enough
- RETURNING id on INSERT is backwards-compatible: existing callers (RegistrationModal) only check `res.ok` and ignore the body
- team-checkin PATCH scopes UPDATE to `status = 'check-in'` tournaments only — prevents accidental check-in on ready/started/finished tournaments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used actual register endpoint path**
- **Found during:** Task 3 (CheckinRegistrationModal)
- **Issue:** Plan spec referenced `/admin/events/[id]/tournaments/[tid]/register` which does not exist — the actual endpoint is `/api/tournament/register`
- **Fix:** CheckinRegistrationModal uses `apiRoutes.TOURNAMENT_REGISTER.path` with the `{ tournament_id, team }` format; rollback uses `apiRoutes.TOURNAMENT_UNEREGISER.path` with `{ registration_id }`
- **Files modified:** CheckinRegistrationModal.svelte
- **Verification:** svelte-check passes 0 errors
- **Committed in:** `48d23b8`

**2. [Rule 1 - Bug] Fixed `rows as Row[]` type cast in page.server.ts**
- **Found during:** Task 2 (checkin page.server.ts)
- **Issue:** `for (const row of rows as Row[])` — TypeScript rejects cross-type cast from `RowList<Record<string, unknown>[]>` to `Row[]`
- **Fix:** Added `as unknown as Row[]` double cast
- **Files modified:** checkin/+page.server.ts
- **Verification:** svelte-check passes 0 errors
- **Committed in:** `37f265a`

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 bug)
**Impact on plan:** Both fixes necessary for correct compilation. No scope creep.

## Issues Encountered
- Biome reports `errorMsg` as unused in CheckinRegistrationModal — false positive (variable is used in the Svelte template). Pre-existing issue with Biome + Svelte, not introduced by this plan.

## Next Phase Readiness
- Check-in flow complete: admins can now manage all tournament check-ins for a day from a single page
- Register endpoint returns registration_id — enables future features that need to reference the registration immediately after creation
- Phase 04 (bracket generation) can proceed: tournament status flow ready→check-in→started is now fully managed

---
*Phase: 03-player-registration*
*Completed: 2026-03-30*

## Self-Check: PASSED

All created files verified present. All task commits (f239b28, 37f265a, 48d23b8) verified in git log.
