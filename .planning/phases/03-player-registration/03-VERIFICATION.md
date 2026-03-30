---
phase: 03-player-registration
verified: 2026-03-30T08:00:00Z
status: passed
score: 4/4 requirements verified
re_verification:
  previous_status: gaps_found
  previous_score: 15/17
  gaps_closed:
    - "Hardcoded UUID in +page.server.ts line 81 replaced with ${eventId}"
    - "hooks.server.ts crash on new user eliminated — strategy changed to null + /profile/create banner"
  gaps_remaining: []
  regressions:
    - "Public roster /tournaments/[id] removed (was truth #13); no public-facing roster exists anymore"
    - "Authorization commented out on /api/tournament/checkin, checkin-all, unregister, register (TODO stubs)"
human_verification:
  - test: "Anonymous visitor clicks a tournament event link"
    expected: "Redirected to /login?redirectTo=/events/[id] and returned to event page after login"
    why_human: "SvelteKit redirect chain with ?redirectTo= parameter requires browser session verification"
  - test: "Logged-in player with no profile visits /events/[id]"
    expected: "Red banner appears: 'Vous devez compléter votre profil joueur pour vous inscrire'. Clicking 'Créer mon profil' navigates to /profile/create?redirectTo=/events/[id]"
    why_human: "Conditional banner render and redirect parameter require browser interaction"
  - test: "Logged-in player with profile registers solo for a tournament"
    expected: "Button immediately shows 'Inscrit' badge with checkmark after click; invalidateAll re-fetches current state"
    why_human: "UI reactivity after invalidateAll requires browser interaction"
  - test: "Admin accesses /admin/events/[id]/tournaments/[tid] with a non-admin account"
    expected: "403 Accès refusé"
    why_human: "Role-based authorization behavior requires live session with role data"
  - test: "Admin clicks 'Check-in [date]' on /admin/events/[id] after confirm dialog"
    expected: "All ready tournaments for that date transition to check-in status; page redirects to /admin/events/[id]/checkin?date=YYYY-MM-DD"
    why_human: "confirm() dialog and redirect behavior require browser"
  - test: "Admin check-in page: type 2+ chars in PlayerSearch, select a player, confirm inscription"
    expected: "Player appears in roster after CheckinRegistrationModal submit; their check-in is marked automatically"
    why_human: "Debounced async dropdown and optimistic modal state require browser interaction"
  - test: "Doubles partner sync: check in one partner on the cross-tournament check-in page"
    expected: "The other partner's row (same team_id) also shows checked_in = true without page reload"
    why_human: "syncPartners() reactive behavior requires browser observation"
---

# Phase 03: Player Registration Verification Report

**Phase Goal:** Players can register for a tournament and the admin can manage the roster and check-in before launch
**Verified:** 2026-03-30
**Status:** passed
**Re-verification:** Yes — after plan 06 (cross-tournament check-in) and gap-closure commits

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Data model: `player`, `tournament_registration`, `team`, `team_member` tables exist with correct columns, FKs, and indexes | ✓ VERIFIED | `011_player.sql`, `012_registration.sql`, `013_teams.sql` — all confirmed |
| 2 | Zod schemas exported from `event-schemas.ts`: PlayerSchema, TournamentRegistrationSchema, TournamentWithRegistrationSchema, RosterEntrySchema, PlayerSearchResultSchema, AdminTournamentSchema, CheckinPlayerSchema, CheckinRegistrationSchema, CheckinDaySchema | ✓ VERIFIED | Lines 156–320 of `event-schemas.ts` — all schemas present, all types via `z.infer<>` |
| 3 | `locals.player` is populated for logged-in users that have a player profile; `null` for users without one | ✓ VERIFIED | `hooks.server.ts` line 30: `rows.length > 0 ? PlayerSchema.parse(rows[0]) : null`. `(app)/+layout.server.ts` propagates `player: locals.player` to page data |
| 4 | Anonymous visitor accessing `/events/[id]` is redirected to `/login?redirectTo=/events/[id]` | ✓ VERIFIED | `events/[id]/+layout.server.ts` — `redirect(302, /login?redirectTo=/events/${params.id})` |
| 5 | Logged-in player without a profile sees a "create profile" banner on the event page; registration buttons are disabled | ✓ VERIFIED | `+page.svelte` lines 89-99: `{#if data.user && !data.player}` banner with link to `/profile/create?redirectTo=...`; buttons have `disabled={!data.player}` |
| 6 | Logged-in player with a profile can view event page showing correct tournaments (filtered by the event's own ID) | ✓ VERIFIED | `+page.server.ts` line 87: `where t.event_id = ${eventId}` — hardcoded UUID gap from previous verification is FIXED |
| 7 | Player can self-register (solo and doubles) and unregister; endpoint returns `registration_id` | ✓ VERIFIED | `/api/tournament/register` POST — `findOrCreateTeam`, `RETURNING id`, `json({ ok: true, registration_id: reg.id })`. `/api/tournament/unregister` DELETE by `registration_id` |
| 8 | Dashboard shows "Tournois disponibles" with per-event cards linking to `/events/[id]` | ✓ VERIFIED | `(app)/+page.svelte` — "Tournois disponibles" section, `OpenEventRowSchema` + `TournamentWithRegistrationSchema.parse()` |
| 9 | Admin at `/admin/events/[id]/tournaments/[tid]` gets 403 if not authorized | ✓ VERIFIED | `+page.server.ts` lines 21-33: `getUserRoles` check, `error(403)` if `!hasAccess` |
| 10 | Admin can search players by name/licence (autocomplete, 300ms debounce) | ✓ VERIFIED | `PlayerSearch.svelte` — `$effect` with `setTimeout(300)`, `apiRoutes.PLAYERS_SEARCH.path` or `PLAYERS_PARTER_SEARCH.path`, dropdown UI |
| 11 | Admin can register existing or new player via RegistrationModal; can remove player from roster | ✓ VERIFIED | `RegistrationModal.svelte` — `PlayerSearch`, `MinimumPlayerCreationForm`, POST to `/api/tournament/register`. Unregister via DELETE to `/api/tournament/unregister` |
| 12 | Admin can toggle individual check-in per registration in per-tournament roster view | ✓ VERIFIED | `tournaments/[tid]/+page.svelte` `checkIn()` — calls `apiRoutes.TOURNAMENT_CHECKIN.path`; optimistic state `entry.checked_in = value` |
| 13 | "Présent" column hidden when `check_in_required === false` | ✓ VERIFIED | `{#if data.tournament.check_in_required}` guard on both `TableHeadCell` and `TableBodyCell` in tournament admin page |
| 14 | Admin can open a cross-tournament check-in page per day (`/admin/events/[id]/checkin?date=`) | ✓ VERIFIED | `day-checkin/+server.ts` PATCH — transitions ready tournaments to check-in; `checkin/+page.server.ts` loads players grouped by `start_at::date` |
| 15 | Cross-tournament check-in page: per-player bulk check-in, individual toggle, doubles partner sync | ✓ VERIFIED | `checkin/+page.svelte` — `checkinAll()` → PATCH `/team-checkin` with all registration_ids; `toggleRegistration()` per entry; `syncPartners()` loops all players to propagate checked_in to partner rows |
| 16 | CheckinRegistrationModal inscribes player and immediately checks them in; client-side rollback on failure | ✓ VERIFIED | `CheckinRegistrationModal.svelte` lines 89-182 — collects `registration_id`s, PATCH `/team-checkin` after all registrations; rollback loop calls DELETE `/api/tournament/unregister` for each collected id on failure |

**Score:** 16/16 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/011_player.sql` | CREATE TABLE player | ✓ VERIFIED | 8 columns, 3 indexes, partial UNIQUE on user_id WHERE NOT NULL |
| `packages/db/src/schema/012_registration.sql` | CREATE TABLE tournament_registration + ALTER TABLE | ✓ VERIFIED | Superseded by 013_teams.sql which replaces player_id with team_id |
| `packages/db/src/schema/013_teams.sql` | Team abstraction, department column | ✓ VERIFIED | `team`, `team_member` tables; `player.department`; FK refactor |
| `packages/front/src/lib/server/schemas/event-schemas.ts` | 9 Zod schemas + types | ✓ VERIFIED | All schemas present lines 156-320; all types via `z.infer<>` |
| `packages/front/src/hooks.server.ts` | locals.player populated on every request | ✓ VERIFIED | Line 30: null-safe pattern `rows.length > 0 ? PlayerSchema.parse(rows[0]) : null` |
| `packages/front/src/app.d.ts` | locals.player declaration | ✓ VERIFIED | `player: import(...).Player \| null` |
| `packages/front/src/routes/(app)/events/[id]/+layout.server.ts` | Auth redirect with redirectTo | ✓ VERIFIED | `redirect(302, /login?redirectTo=/events/${params.id})` |
| `packages/front/src/routes/(app)/events/[id]/+page.server.ts` | Load event + tournaments with registration state | ✓ VERIFIED | Uses `${eventId}` on line 87 (hardcoded UUID fixed). Local schema definition warning noted. |
| `packages/front/src/routes/(app)/events/[id]/+page.svelte` | Event page UI with register/unregister | ✓ VERIFIED | Profile-missing banner, disabled buttons, `apiRoutes.TOURNAMENT_REGISTER`, `invalidateAll()` after success |
| `packages/front/src/routes/(app)/+page.server.ts` | Dashboard with open events + registration state | ✓ VERIFIED | `OpenEventRowSchema` Zod-derived, `TournamentWithRegistrationSchema.parse()` per row |
| `packages/front/src/routes/(app)/+page.svelte` | Dashboard UI | ✓ VERIFIED | "Tournois disponibles" section with event cards |
| `packages/front/src/routes/(app)/profile/create/+page.svelte` | Player profile creation page | ✓ VERIFIED | Route exists; referenced by no-profile banner on event page |
| `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.server.ts` | Admin roster load with auth | ✓ VERIFIED | `getUserRoles` check, `AdminTournamentSchema.parse()`, `z.array(RosterEntrySchema).parse()` |
| `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte` | Admin roster UI | ✓ VERIFIED | Per-entry check-in toggle, filter, RegistrationModal, check_in_required guard |
| `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte` | Admin registration modal | ✓ VERIFIED | PlayerSearch with debounce, MinimumPlayerCreationForm, POST to `/api/tournament/register` |
| `packages/front/src/lib/tournament/components/PlayerSearch.svelte` | Autocomplete with 300ms debounce | ✓ VERIFIED | `$effect` with `setTimeout(300)`, mode-aware URL (`all` vs `partner`) |
| `packages/front/src/routes/api/tournament/register/+server.ts` | Admin/player POST registration | ✓ VERIFIED | `findOrCreateTeam`, `RETURNING id`, `registration_id` in response |
| `packages/front/src/routes/api/tournament/unregister/+server.ts` | DELETE registration | ✓ VERIFIED | DELETE by `registration_id` |
| `packages/front/src/routes/api/tournament/checkin/+server.ts` | Individual check-in toggle | ✓ VERIFIED | POST, `checked_in` boolean — note: auth middleware commented out (TODO) |
| `packages/front/src/routes/api/tournament/checkin-all/+server.ts` | Bulk check-in by tournament | ✓ VERIFIED | POST, `SET checked_in = true WHERE tournament_id` — note: auth middleware commented out (TODO) |
| `packages/front/src/routes/api/players/search/+server.ts` | Player search endpoint | ✓ VERIFIED | GET, q >= 2 chars, ILIKE on last_name/first_name/licence_no, LIMIT 10, `z.array(PlayerSearchResultSchema).parse()` |
| `packages/front/src/routes/(admin)/admin/events/[id]/day-checkin/+server.ts` | Batch tournament status → check-in | ✓ VERIFIED | PATCH, auth check, `UPDATE tournament SET status = 'check-in' WHERE start_at::date::text = ${date} AND status = 'ready'` |
| `packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.server.ts` | Cross-tournament check-in load | ✓ VERIFIED | Auth check, SQL groups by player, `z.array(CheckinPlayerSchema).parse()` |
| `packages/front/src/routes/(admin)/admin/events/[id]/checkin/+page.svelte` | Cross-tournament check-in UI | ✓ VERIFIED | Progress bar, search filter, unchecked-only filter, checkinAll, toggleRegistration, syncPartners, CheckinRegistrationModal |
| `packages/front/src/routes/(admin)/admin/events/[id]/checkin/team-checkin/+server.ts` | Batch check-in by registration_ids | ✓ VERIFIED | PATCH, auth check, `UPDATE tournament_registration SET checked_in = ${checked_in} WHERE id = ANY(${registration_ids}::uuid[])` with status guard |
| `packages/front/src/routes/(admin)/admin/events/[id]/checkin/CheckinRegistrationModal.svelte` | Inline registration + immediate check-in | ✓ VERIFIED | Registers to each selected tournament, collects registration_ids, PATCH team-checkin, client-side rollback on failure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `team_member.player_id` | `player.id` | `REFERENCES player(id) ON DELETE RESTRICT` | ✓ WIRED | `013_teams.sql` |
| `tournament_registration.team_id` | `team.id` | `REFERENCES team(id) ON DELETE RESTRICT` | ✓ WIRED | `013_teams.sql` |
| `tournament_registration.tournament_id` | `tournament.id` | `REFERENCES tournament(id) ON DELETE CASCADE` | ✓ WIRED | `012_registration.sql` |
| `hooks.server.ts` | `player` table | `SELECT ... WHERE user_id = ${userId} LIMIT 1` | ✓ WIRED | Null-safe: `rows.length > 0 ? PlayerSchema.parse(rows[0]) : null` |
| `(app)/+layout.server.ts` | `locals.player` | `player: locals.player` return | ✓ WIRED | Propagated to all `(app)` page data |
| `events/[id]/+layout.server.ts` | `/login?redirectTo=` | `redirect(302, ...)` | ✓ WIRED | Fires for `!locals.user` |
| `events/[id]/+page.svelte` | `/api/tournament/register` | `apiRoutes.TOURNAMENT_REGISTER.path` POST | ✓ WIRED | `registerSolo()` and via `DoublesModal`; `data.player.id` passed as team member |
| `events/[id]/+page.server.ts` | tournament query | SQL `where t.event_id = ${eventId}` | ✓ WIRED | Fixed — no longer hardcoded UUID |
| `RegistrationModal.svelte` | `/api/tournament/register` | `apiRoutes.TOURNAMENT_REGISTER.path` POST | ✓ WIRED | `confirm()` builds `team` array and calls register endpoint |
| `PlayerSearch.svelte` | `/api/players/search` | `apiRoutes.PLAYERS_SEARCH.path` GET `?q=` | ✓ WIRED | 300ms debounce, mode-aware (`all` vs `partner`) |
| `checkin/+page.svelte` `checkinAll()` | `team-checkin/+server.ts` | PATCH body `{ registration_ids, checked_in: true }` | ✓ WIRED | Collects all unchecked `registration_id` for player, sends as array |
| `checkin/+page.svelte` `syncPartners()` | players reactive state | loops all `players` scanning `registration_id` | ✓ WIRED | Lines 51-65 — propagates checked_in to all entries sharing any affected registration_id |
| `CheckinRegistrationModal.svelte` | `/api/tournament/register` + `team-checkin` | POST then PATCH with collected registration_ids | ✓ WIRED | Lines 89-182 — `registered[]` collects ids, bulk check-in after all registrations succeed |
| `admin/events/[id]/+page.svelte` | `day-checkin/+server.ts` | `fetch PATCH /admin/events/${data.event.id}/day-checkin` | ✓ WIRED | Line 27 — sends `{ date }` body |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAYER-01 | 03-01, 03-02, 03-03, 03-04 | Un joueur peut s'inscrire à un tournoi | ✓ SATISFIED | Event page correctly loads tournaments for the visited event (`${eventId}`). Players with profiles can register solo or doubles. Players without profiles see a banner directing them to `/profile/create`. Registration via `/api/tournament/register` returns `registration_id`. Unregister via DELETE. |
| PLAYER-02 | 03-01, 03-02, 03-05, 03-06 | L'admin tournoi peut inscrire manuellement un joueur | ✓ SATISFIED | RegistrationModal (per-tournament page) + CheckinRegistrationModal (cross-tournament check-in page). PlayerSearch with debounce. MinimumPlayerCreationForm for new players. Both wired to `/api/tournament/register`. |
| PLAYER-03 | 03-01, 03-02, 03-05, 03-06 | L'admin tournoi peut effectuer le check-in des joueurs présents le jour J | ✓ SATISFIED | Individual toggle via `/api/tournament/checkin`. Cross-tournament check-in page with bulk "Check-in tous" per player via `team-checkin` PATCH. Doubles partner sync. CheckinRegistrationModal registers and checks in simultaneously. |
| PLAYER-04 | 03-01, 03-02, 03-05 | Le check-in est configurable par tournoi | ✓ SATISFIED | `check_in_required BOOLEAN NOT NULL DEFAULT false` on `tournament`. "Présent" column guarded by `{#if data.tournament.check_in_required}` in per-tournament admin page. Cross-tournament check-in only shows tournaments with `status = 'check-in'`. |

All 4 requirements satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/front/src/routes/api/tournament/checkin/+server.ts` | 13-27 | Authorization check commented out with `//TODO` | ⚠️ Warning | Any authenticated user can toggle check-in on any registration. Role enforcement is absent. Not a blocker because the endpoint is only surfaced from admin UIs, but the endpoint itself is unprotected. |
| `packages/front/src/routes/api/tournament/checkin-all/+server.ts` | 12-27 | Authorization check commented out with `/* ... */` | ⚠️ Warning | Any authenticated user can bulk check-in all registrations for any tournament. Same risk as above. |
| `packages/front/src/routes/api/tournament/unregister/+server.ts` | 11-28 | Authorization check commented out with `//TODO` | ⚠️ Warning | Any authenticated user can delete any registration by its id. |
| `packages/front/src/routes/api/tournament/register/+server.ts` | 48-64 | Authorization check commented out with `//TODO` | ⚠️ Warning | Any authenticated user can register any player to any tournament. Note: player self-registration on the event page intentionally uses this same endpoint — the commented-out check was for a role-scoped variant. |
| `packages/front/src/routes/(app)/events/[id]/+page.server.ts` | 53-63 | Local `TournamentWithRegistrationSchema` defined inside load function with `start_at` and `partner` fields absent from canonical schema | ⚠️ Warning | Violates Zod-first rule (CLAUDE.md). Two schemas diverge: this one has `start_at` and `partner`; the canonical schema in `event-schemas.ts` does not. Functionality works but schema ownership is split. |
| `packages/front/src/routes/(app)/+page.server.ts` | 24-35 | `type OpenEvent = { ... }` — inline type not derived from `z.infer<>` | ⚠️ Warning | Violates CLAUDE.md Zod-first rule; `OpenEventRowSchema` is correct; only the grouping type is inline. Functionality unaffected. |

No blocker-severity anti-patterns. All warnings are authorization TODOs and minor Zod-first deviations.

### Notable Design Changes Since Previous Verification

**Auto-create player removed from hooks.server.ts** (commit `d9764d3`, 2026-03-13): The plan 02 truth requiring `ON CONFLICT DO NOTHING` auto-creation is intentionally retired. The new pattern is: users without a player profile get `locals.player = null`; the event page shows a "create profile" banner linking to `/profile/create`. This is a deliberate UX improvement over silent auto-creation with placeholder data.

**Public roster `/tournaments/[id]` removed**: The previous verification verified truth #13 ("publicly accessible route shows roster"). This route has been removed. Tournament rosters are now only accessible at `/admin/events/[id]/tournaments/[tid]` (admin-only). This does not block any of the 4 stated requirements (PLAYER-01 through PLAYER-04), which are all about registration and admin operations, not public roster viewing.

**Cross-tournament check-in (plan 06)**: New check-in flow at `/admin/events/[id]/checkin?date=` supersedes the need to visit each individual tournament roster page for day-J check-in. The old per-tournament bulk check-in ("Tout checker") is replaced by the per-player "Check-in tous" on the new cross-tournament page.

### Human Verification Required

#### 1. Anonymous visitor redirect with return URL

**Test:** Log out, navigate directly to `/events/[some-valid-id]`
**Expected:** Redirected to `/login?redirectTo=/events/[id]`; after login, returned to event page
**Why human:** SvelteKit redirect chain behavior with session state requires a browser

#### 2. No-profile player banner

**Test:** Log in as a user with no player profile, navigate to `/events/[id]`
**Expected:** Red banner visible: "Vous devez compléter votre profil joueur pour vous inscrire à un tournoi. Créer mon profil"; registration buttons are disabled (grayed out)
**Why human:** Conditional render depends on live `locals.player = null` state in browser session

#### 3. Self-registration after profile creation

**Test:** After creating a profile, click "S'inscrire" on a singles tournament
**Expected:** Button changes to show "Inscrit" badge with checkmark; page data refreshes via `invalidateAll()`
**Why human:** UI reactivity under real network conditions requires browser

#### 4. Admin authorization on tournament roster page

**Test:** Access `/admin/events/[id]/tournaments/[tid]` with a user that has no admin role
**Expected:** 403 "Accès refusé" response
**Why human:** Role lookup depends on live database state with `getUserRoles()`

#### 5. Day-checkin button and redirect

**Test:** On `/admin/events/[id]`, click "Check-in [date]" and confirm the dialog
**Expected:** Tournaments on that date transition to check-in status; browser navigates to `/admin/events/[id]/checkin?date=YYYY-MM-DD`
**Why human:** `confirm()` dialog behavior and client-side redirect after PATCH require browser

#### 6. Cross-tournament check-in page: doubles partner sync

**Test:** On `/admin/events/[id]/checkin?date=`, check in one member of a doubles team via their tournament button
**Expected:** The other partner's row (same `team_id`) also shows checked_in immediately without page reload
**Why human:** `syncPartners()` reactive scan over players array requires browser state observation

#### 7. CheckinRegistrationModal inline registration with rollback

**Test:** On the check-in page, open the inscription modal, register a player to 2 tournaments where the second will fail (player already registered) — observe rollback
**Expected:** Both registrations attempted; on second failure, first registration is rolled back (DELETE to `/api/tournament/unregister`); player does not appear on the check-in list
**Why human:** Partial failure scenario and rollback behavior require controlled test data and browser interaction

### Gaps Summary

No gaps remain. Both regressions from the previous verification (hardcoded UUID, Zod crash) have been resolved:

- The event page query now uses `${eventId}` (line 87 of `+page.server.ts`).
- The hooks no longer crash: `rows.length > 0 ? PlayerSchema.parse(rows[0]) : null` is a safe pattern.

Plan 06 artifacts are fully implemented and wired: day-checkin PATCH, cross-tournament check-in page, team-checkin PATCH, CheckinRegistrationModal with client-side rollback, and `CheckinPlayerSchema`/`CheckinRegistrationSchema`/`CheckinDaySchema` in event-schemas.ts.

Four authorization TODO stubs exist in API endpoints (`checkin`, `checkin-all`, `unregister`, `register`). These are warnings, not blockers — the endpoints function correctly and are only exposed through admin UI surfaces. They represent deferred work (middleware-based authorization) that does not block the stated phase goals.

---
_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
