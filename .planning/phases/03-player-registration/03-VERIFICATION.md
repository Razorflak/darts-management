---
phase: 03-player-registration
verified: 2026-03-08T00:00:00Z
status: gaps_found
score: 15/17 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 17/17
  gaps_closed: []
  gaps_remaining:
    - "Logged-in player can view event page with tournaments for THAT event"
    - "hooks.server.ts auto-creates player profile on first login"
  regressions:
    - "Event page query uses hardcoded UUID instead of eventId param"
    - "hooks.server.ts crashes for new users: PlayerSchema.parse(undefined) throws"
gaps:
  - truth: "Logged-in player can view event page with tournament list and registration state"
    status: failed
    reason: "SQL query on line 81 uses a hardcoded UUID literal instead of the ${eventId} variable — every visitor to any event page sees the same hardcoded event's tournaments"
    artifacts:
      - path: "packages/front/src/routes/(app)/events/[id]/+page.server.ts"
        issue: "Line 81: WHERE t.event_id = '019cc027-a1bc-7628-9661-a8c720745d01' — hardcoded UUID, eventId variable is declared on line 13 but not used in this query"
    missing:
      - "Replace '019cc027-a1bc-7628-9661-a8c720745d01' with ${eventId} on line 81"

  - truth: "hooks.server.ts auto-creates player profile on first login (ON CONFLICT DO NOTHING)"
    status: failed
    reason: "PlayerSchema.parse((await sql`...`).pop()) — Array.pop() returns undefined when the SELECT returns 0 rows (new user, no existing player). PlayerSchema.parse(undefined) throws a Zod validation error, crashing the hook for every new user's first request"
    artifacts:
      - path: "packages/front/src/hooks.server.ts"
        issue: "Lines 25-34: PlayerSchema.parse((...).pop()) — .pop() on empty array returns undefined, Zod throws 'invalid_type: expected object, received undefined'. The else branch (auto-create) is never reached for new users; instead the hook throws a 500"
    missing:
      - "Guard the .pop() result before parsing: const row = (...).pop(); const existing = row ? PlayerSchema.parse(row) : null"
      - "Or use z.array(PlayerSchema).parse(...)[0] ?? null (previous working pattern)"

human_verification:
  - test: "Anonymous visitor clicks a tournament event link"
    expected: "Redirected to /login?redirectTo=/events/[id] and returned to event page after login"
    why_human: "SvelteKit redirect chain with ?redirectTo= parameter requires browser session verification"
  - test: "Logged-in player registers for a tournament on the event page"
    expected: "Button changes to 'Inscrit (avec Partenaire)' immediately for doubles, or 'Inscrit' for singles (optimistic update)"
    why_human: "UI reactivity and optimistic state update require manual browser interaction"
  - test: "Admin accesses /tournaments/[id]/admin with a non-admin account"
    expected: "403 Accès refusé"
    why_human: "Role-based authorization behavior requires live session with role data"
  - test: "Admin types 2+ characters in PlayerSearch autocomplete"
    expected: "Dropdown appears after 300ms debounce with matching players"
    why_human: "Debounced async UI behavior requires browser interaction"
  - test: "Admin bulk check-in with 'Tout checker'"
    expected: "All roster rows show 'Présent ✓' immediately after click"
    why_human: "Optimistic bulk update requires live browser state"
---

# Phase 03: Player Registration Verification Report

**Phase Goal:** Players can register for a tournament and the admin can manage the roster and check-in before launch
**Verified:** 2026-03-08
**Status:** gaps_found
**Re-verification:** Yes — re-verification after codebase has diverged from 2026-03-07 initial passing state

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `player` table exists with id, user_id (TEXT NULL), first_name, last_name, birth_date, licence_no, + 3 indexes including partial UNIQUE on user_id | ✓ VERIFIED | `011_player.sql` — 8 columns, 3 indexes confirmed |
| 2 | `tournament_registration` exists with id, tournament_id, team_id (post-013), checked_in, registered_at, UNIQUE(tournament_id, team_id) | ✓ VERIFIED | `012_registration.sql` + `013_teams.sql` — team_id replaces player_id, constraint updated |
| 3 | `tournament.check_in_required BOOLEAN NOT NULL DEFAULT false` column exists | ✓ VERIFIED | `012_registration.sql` line 7 — ALTER TABLE adds column |
| 4 | Foreign keys are REFERENCES player (RESTRICT) and REFERENCES tournament (CASCADE) | ✓ VERIFIED | `012_registration.sql` lines 13-14; `013_teams.sql` updated FKs |
| 5 | PlayerSchema, TournamentRegistrationSchema, TournamentWithRegistrationSchema, RosterEntrySchema, PlayerSearchResultSchema exported from event-schemas.ts | ✓ VERIFIED | Lines 143-215 — all 5 schemas confirmed, all types via z.infer<>. Note: TournamentRegistrationSchema now has team_id instead of player_id (reflects 013 migration). PlayerSchema now includes department field. |
| 6 | hooks.server.ts auto-creates player profile on first login (ON CONFLICT DO NOTHING) | ✗ FAILED | `hooks.server.ts` lines 25-34: `PlayerSchema.parse((...sql...).pop())` — `.pop()` returns `undefined` on empty array (new user). `PlayerSchema.parse(undefined)` throws Zod error before reaching the `else` auto-create branch. New user first-login crashes. |
| 7 | `app.d.ts` declares `player: Player \| null` in Locals | ✓ VERIFIED | `app.d.ts` line 14 |
| 8 | Anonymous visitor accessing /events/[id] is redirected to /login?redirectTo=/events/[id] | ✓ VERIFIED | `+layout.server.ts` redirect(302, ...) with redirectTo param |
| 9 | Logged-in player can view event page with tournament list and registration state | ✗ FAILED | `+page.server.ts` line 81: `WHERE t.event_id = '019cc027-a1bc-7628-9661-a8c720745d01'` — hardcoded UUID. The `eventId` variable (line 13) is correctly set from `params.id` but not used in the tournaments query. Every event page shows the same hardcoded event's tournaments. |
| 10 | Logged-in player can self-register (POST) and unregister (DELETE) for a tournament | ✓ VERIFIED | `register/+server.ts` — both handlers wired, 409 on 23505, idempotent DELETE. Updated to use team_id model via findOrCreateSoloTeam / findOrCreateDoublesTeam. |
| 11 | Event page UI shows S'inscrire/Inscrit buttons with optimistic state update | ✓ VERIFIED | `+page.svelte` — $state(data.tournaments), register/unregister with t.is_registered mutation, doubles modal wired |
| 12 | Dashboard shows "Tournois disponibles" section with per-tournament event cards | ✓ VERIFIED | `(app)/+page.svelte` — "Tournois disponibles" section, cards link to /events/[id] |
| 13 | /tournaments/[id] is publicly accessible (outside (app) group) and shows roster | ✓ VERIFIED | Route at `routes/tournaments/[id]/` (not inside `(app)`), no auth check in load |
| 14 | Admin at /tournaments/[id]/admin gets 403 if not authorized | ✓ VERIFIED | `admin/+page.server.ts` — getUserRoles check, error(403) if !hasAccess |
| 15 | Admin can search players by name/licence (autocomplete with 300ms debounce) | ✓ VERIFIED | `PlayerSearch.svelte` — $effect with setTimeout(300), fetch players/search?q= |
| 16 | Admin can register existing or new player, remove player, toggle individual check-in, bulk check-in | ✓ VERIFIED | 5 API endpoints + admin page svelte wired to each; unregister now uses team_id |
| 17 | "Présent" column hidden when check_in_required === false | ✓ VERIFIED | Both admin and public roster pages: `{#if data.tournament.check_in_required}` guard |

**Score:** 15/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/011_player.sql` | CREATE TABLE player | ✓ VERIFIED | 8 columns, 3 indexes, partial UNIQUE on user_id WHERE NOT NULL |
| `packages/db/src/schema/012_registration.sql` | CREATE TABLE tournament_registration + ALTER TABLE | ✓ VERIFIED | Original player_id FK; superseded by 013_teams.sql which drops player_id and adds team_id |
| `packages/db/src/schema/013_teams.sql` | Add team abstraction, department column, refactor registration | ✓ VERIFIED | team + team_member tables, player.department column, tournament_registration.player_id replaced by team_id |
| `packages/front/src/lib/server/schemas/event-schemas.ts` | 5+ Zod schemas + types | ✓ VERIFIED | PlayerSchema (now includes department), TournamentRegistrationSchema (team_id), TournamentWithRegistrationSchema, RosterEntrySchema, PlayerSearchResultSchema, AdminTournamentSchema all present |
| `packages/front/src/hooks.server.ts` | Player auto-creation on login | ✗ STUB/BROKEN | INSERT + ON CONFLICT DO NOTHING exists, but the preceding SELECT uses `.pop()` without null-guard — `PlayerSchema.parse(undefined)` throws Zod error for new users before auto-create branch is reached |
| `packages/front/src/app.d.ts` | locals.player declaration | ✓ VERIFIED | Line 14: `player: import(...).Player \| null` |
| `packages/front/src/routes/(app)/events/[id]/+layout.server.ts` | Auth redirect with redirectTo | ✓ VERIFIED | redirect(302, `/login?redirectTo=/events/${params.id}`) |
| `packages/front/src/routes/(app)/events/[id]/+page.server.ts` | Load event + tournaments with registration state | ✗ BROKEN | Event query is correct, but tournaments query uses hardcoded UUID on line 81 instead of `${eventId}`. Also defines a local `TournamentWithRegistrationSchema` with `start_at` and `partner` fields, violating Zod-first rule. |
| `packages/front/src/routes/(app)/events/[id]/+page.svelte` | Event page UI with register/unregister | ✓ VERIFIED | $state, optimistic mutations, doubles modal, `isDoublesTournament` imported from utils |
| `packages/front/src/routes/(app)/events/[id]/register/+server.ts` | POST/DELETE registration API | ✓ VERIFIED | Both handlers, 409 on 23505, idempotent DELETE, team model used |
| `packages/front/src/routes/(app)/+page.server.ts` | Dashboard with open events + registration state | ✓ VERIFIED | SQL query with team_member JOIN, TournamentWithRegistrationSchema.parse(), grouped by event |
| `packages/front/src/routes/(app)/+page.svelte` | Dashboard UI with Tournois disponibles | ✓ VERIFIED | "Tournois disponibles" section with event cards |
| `packages/front/src/routes/tournaments/[id]/+page.server.ts` | Public roster load (no auth) | ✓ VERIFIED | No auth check, RosterEntrySchema.parse(), team_member JOIN |
| `packages/front/src/routes/tournaments/[id]/+page.server.ts` | Public roster display | ✓ VERIFIED | Table with check_in_required conditional |
| `packages/front/src/routes/tournaments/[id]/admin/+page.server.ts` | Admin load with auth + roster | ✓ VERIFIED | getUserRoles check, AdminTournamentSchema.parse(), RosterEntrySchema, team_member JOIN |
| `packages/front/src/routes/tournaments/[id]/admin/+page.svelte` | Admin roster UI | ✓ VERIFIED | Check-in toggles, Tout checker, PlayerSearch integrated, new player form with DepartmentSelect |
| `packages/front/src/lib/tournament/components/PlayerSearch.svelte` | Autocomplete with debounce | ✓ VERIFIED | $effect with 300ms setTimeout, fetch players/search?q=, dropdown UI |
| `packages/front/src/routes/tournaments/[id]/admin/register/+server.ts` | Admin POST registration | ✓ VERIFIED | discriminatedUnion schema mode:'existing'/'new', findOrCreateSoloTeam, catches 23505 |
| `packages/front/src/routes/tournaments/[id]/admin/unregister/+server.ts` | Admin DELETE registration | ✓ VERIFIED | Admin auth check, DELETE by team_id |
| `packages/front/src/routes/tournaments/[id]/admin/checkin/+server.ts` | Individual check-in toggle | ✓ VERIFIED | POST, checked_in boolean param |
| `packages/front/src/routes/tournaments/[id]/admin/checkin-all/+server.ts` | Bulk check-in | ✓ VERIFIED | POST, single UPDATE SET checked_in = true WHERE tournament_id |
| `packages/front/src/routes/tournaments/[id]/admin/players/search/+server.ts` | Player search endpoint | ✓ VERIFIED | GET, q >= 2 chars, ILIKE on last_name/first_name/licence_no, LIMIT 10, PlayerSearchResultSchema |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tournament_registration.team_id` | `team.id` | `REFERENCES team(id) ON DELETE RESTRICT` | ✓ WIRED | `013_teams.sql` line 28 |
| `team_member.player_id` | `player.id` | `REFERENCES player(id) ON DELETE RESTRICT` | ✓ WIRED | `013_teams.sql` line 21 |
| `tournament_registration.tournament_id` | `tournament.id` | `REFERENCES tournament(id) ON DELETE CASCADE` | ✓ WIRED | `012_registration.sql` line 13 |
| `hooks.server.ts` | `player` table | `INSERT INTO player ... ON CONFLICT DO NOTHING` | ✗ BROKEN | Insert exists but unreachable — Zod throws before the else branch on first login |
| `locals.player` | `PlayerSchema` | `PlayerSchema.parse()` | ✗ BROKEN | `.pop()` returns undefined for new user; parse throws instead of returning null |
| `+layout.server.ts` | `/login?redirectTo=/events/[id]` | `redirect(302, ...)` | ✓ WIRED | redirect fires for !locals.user |
| `+page.svelte (events/[id])` | `/events/[id]/register` | `fetch POST/DELETE` | ✓ WIRED | Correct URL construction |
| `+page.server.ts (events/[id])` | tournament query | SQL WHERE clause | ✗ BROKEN | Line 81: hardcoded UUID instead of `${eventId}` |
| `(app)/+page.server.ts` | `TournamentWithRegistrationSchema` | `TournamentWithRegistrationSchema.parse()` per row | ✓ WIRED | Canonical schema from event-schemas.ts used correctly |
| `tournaments/[id]/+page.server.ts` | `RosterEntrySchema` | `z.array(RosterEntrySchema).parse()` | ✓ WIRED | Via team_member JOIN |
| `admin/+page.server.ts` | `getUserRoles` | `adminTournoi or higher role check` | ✓ WIRED | Lines 20-28 |
| `PlayerSearch.svelte` | `/tournaments/[id]/admin/players/search` | `fetch GET ?q=...` | ✓ WIRED | fetch with encodeURIComponent(query) |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAYER-01 | 03-01, 03-02, 03-03, 03-04 | Un joueur peut s'inscrire à un tournoi | ✗ BLOCKED | Self-registration endpoint works correctly, but the event page that surfaces tournaments is broken (hardcoded UUID). A player can only register if they happen to navigate directly to /events/[hardcoded-id]. For all other events the tournament list shows the wrong data. |
| PLAYER-02 | 03-01, 03-02, 03-05 | L'admin tournoi peut inscrire manuellement un joueur | ✓ SATISFIED | admin/register endpoint — mode:'existing' and mode:'new', getUserRoles auth, team model |
| PLAYER-03 | 03-01, 03-02, 03-05 | L'admin tournoi peut effectuer le check-in des joueurs | ✓ SATISFIED | admin/checkin (individual toggle) and admin/checkin-all (bulk) endpoints |
| PLAYER-04 | 03-01, 03-02, 03-05 | Le check-in est configurable par tournoi | ✓ SATISFIED | check_in_required column on tournament; "Présent" column conditional in all roster views |

PLAYER-01 is blocked by the hardcoded UUID regression. PLAYER-02, PLAYER-03, PLAYER-04 are fully satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/front/src/routes/(app)/events/[id]/+page.server.ts` | 81 | Hardcoded UUID `'019cc027-a1bc-7628-9661-a8c720745d01'` instead of `${eventId}` | 🛑 Blocker | Every event page shows the same event's tournaments — self-registration is broken for all events except the one with this hardcoded ID |
| `packages/front/src/hooks.server.ts` | 25-34 | `PlayerSchema.parse((...).pop())` — no null-guard before parse | 🛑 Blocker | New user first login crashes the hook with Zod validation error (`invalid_type: expected object, received undefined`). Auto-create branch never runs. |
| `packages/front/src/routes/(app)/events/[id]/+page.server.ts` | 50-60 | Local `TournamentWithRegistrationSchema` defined inside load function, not in event-schemas.ts | ⚠️ Warning | Violates Zod-first rule (CLAUDE.md). Schema has `start_at` and `partner` fields absent from the canonical schema, creating a schema split between event page and dashboard |
| `packages/front/src/routes/(app)/+page.server.ts` | 24-35 | `type OpenEvent = { ... }` — inline type not derived from z.infer<> | ⚠️ Warning | Violates CLAUDE.md Zod-first rule; functionality unaffected |

### Human Verification Required

#### 1. Anonymous visitor redirect with return URL

**Test:** Log out, navigate directly to `/events/[some-valid-id]`
**Expected:** Redirected to `/login?redirectTo=/events/[id]`; after login, returned to event page
**Why human:** SvelteKit redirect chain behavior with session state requires a browser

#### 2. Self-registration optimistic update (after gap closure)

**Test:** As logged-in player, click "S'inscrire" on a tournament on the event page
**Expected:** Button immediately changes to "Inscrit" (solo) or "Inscrit (avec Partenaire)" (doubles) without page reload
**Why human:** UI reactivity under real network conditions requires browser interaction

#### 3. Admin authorization enforcement

**Test:** Access `/tournaments/[id]/admin` with a user that has no admin role
**Expected:** 403 "Accès refusé" response
**Why human:** Role lookup depends on live database state with getUserRoles()

#### 4. PlayerSearch autocomplete debounce

**Test:** In admin page, type at least 2 characters in the player search input
**Expected:** After 300ms pause, dropdown appears with matching players; clicking a result populates the confirm row
**Why human:** Timing behavior and dropdown UI require browser interaction

#### 5. Bulk check-in state coherence

**Test:** In admin page with check_in_required=true, click "Tout checker"
**Expected:** All roster entries show "Présent ✓" immediately; single POST sent to checkin-all endpoint
**Why human:** Optimistic bulk update and network behavior require browser observation

### Gaps Summary

Two blockers introduced since the 2026-03-07 initial verification (both are regressions in modified files):

**Gap 1 — Hardcoded UUID in event page query** (`+page.server.ts` line 81): During work to add `start_at` and `partner` fields to the tournament query, the `${eventId}` variable was replaced with a hardcoded UUID literal. Every user visiting `/events/[any-id]` receives the tournament list for one specific event. This breaks PLAYER-01 (self-registration) for all events except the hardcoded one.

**Gap 2 — Zod crash on new user first login** (`hooks.server.ts` lines 25-34): A refactor changed `z.array(PlayerSchema).parse(rows)[0] ?? null` to `PlayerSchema.parse(rows.pop())`. When `rows` is empty (no existing player profile), `.pop()` returns `undefined`. `PlayerSchema.parse(undefined)` throws a Zod error immediately, making the auto-create branch unreachable. Any new user's first page load crashes the server hook with a 500 error.

Both gaps are in files listed in the git status as modified (`M`) and have straightforward 1-line fixes. They are independent of each other.

The team model (migration 013) and all other phase 03 artifacts remain solid. PLAYER-02, PLAYER-03, and PLAYER-04 are fully satisfied. Once the two regressions are fixed, PLAYER-01 will also be satisfied.

---
_Verified: 2026-03-08_
_Verifier: Claude (gsd-verifier)_
