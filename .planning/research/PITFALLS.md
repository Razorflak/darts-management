# Pitfalls Research

**Domain:** Tournament management platform — SvelteKit + PostgreSQL + Better Auth
**Researched:** 2026-02-28
**Confidence:** HIGH (auth, concurrent writes, SQL) / MEDIUM (bracket algorithms, phase advancement)

---

## Critical Pitfalls

### Pitfall 1: Better Auth — `event.locals` Not Populated Automatically

**What goes wrong:**
`svelteKitHandler` does not automatically populate `event.locals.user` or `event.locals.session`. The session is created in the database, but server-side code (load functions, form actions, API routes) sees no user. Everything appears to work during development because the cookie is set, but all server-side auth checks silently fail or throw.

**Why it happens:**
Developers assume the handler middleware handles everything, as other auth libraries (Auth.js) do. The Better Auth SvelteKit integration is handler-based, not middleware-injecting by default.

**How to avoid:**
Manually fetch and assign session in `hooks.server.ts`, before calling `svelteKitHandler`:

```typescript
// src/hooks.server.ts
import { auth } from '$lib/server/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'

export const handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  })
  event.locals.user = session?.user ?? null
  event.locals.session = session?.session ?? null
  return svelteKitHandler({ event, resolve, auth })
}
```

Update `app.d.ts` to type `locals` correctly. Every server route that needs auth reads from `event.locals.user`.

**Warning signs:**
- `event.locals.user` is always `undefined` in load functions
- Auth checks work via client-side `useSession()` but fail in `+page.server.ts`
- Redirects loop or session appears to not exist despite valid cookie

**Phase to address:** Auth phase (phase introducing Better Auth integration)

---

### Pitfall 2: SvelteKit Route Protection — `+layout.server.ts` Is Not a Guard

**What goes wrong:**
Placing authorization checks in `+layout.server.ts` feels correct — it runs for every page under that layout. But SvelteKit runs all load functions in parallel. A `redirect()` or `error()` thrown in a layout load does NOT prevent child load functions from running. API routes (`+server.ts`) are entirely unaffected by layout load functions.

**Why it happens:**
Mental model from traditional middleware (Express, Next.js Pages Router) where guards execute before handlers. SvelteKit's architecture is parallel, not sequential.

**How to avoid:**
Protect routes and API endpoints exclusively in `hooks.server.ts` using the `handle` function. Use a pattern like:

```typescript
// hooks.server.ts — route guard
const PROTECTED_PREFIXES = ['/admin', '/tournaments']
if (PROTECTED_PREFIXES.some(p => event.url.pathname.startsWith(p))) {
  if (!event.locals.user) throw redirect(302, '/login')
}
```

For role checks (tournament admin vs. organizer vs. federal admin), implement a `requireRole(event, role)` helper that throws `error(403)` early in each server route. Do not rely on layout-level checks for security.

**Warning signs:**
- "Protected" pages that an unauthenticated user can reach by fetching the API endpoint directly
- Authorization logic only in `+layout.server.ts` with no checks in `+server.ts` files
- Tests that bypass the browser pass through all guarded routes

**Phase to address:** Auth phase, and every phase that introduces new server routes

---

### Pitfall 3: Concurrent Result Entry — Double-Write Race Condition

**What goes wrong:**
Two tournament admins enter results for different matches simultaneously. Both read the match row, both validate it is `pending`, both write `completed` status and attempt to advance the phase. The phase advancement check ("are all matches in this phase done?") runs twice concurrently on stale data. The result: phase advancement triggers twice, generating duplicate bracket entries or corrupting `advances_to_match_id` slots.

**Why it happens:**
PostgreSQL's default isolation level is `READ COMMITTED`. A `SELECT` followed by an `UPDATE` within the same logical operation is not atomic unless explicitly locked.

**How to avoid:**
Use `SELECT ... FOR UPDATE` on the match row at the start of each result-entry transaction to serialize concurrent writes to the same match:

```sql
BEGIN;
SELECT id, status FROM match WHERE id = $1 FOR UPDATE;
-- validate status = 'pending', then update
UPDATE match SET sets_a = $2, sets_b = $3, status = 'completed', completed_at = NOW()
WHERE id = $1;
-- run phase advancement check inside same transaction
COMMIT;
```

For the phase advancement check itself (counting completed matches in a phase), use `SELECT COUNT(*) FROM match WHERE phase_id = $1 AND status != 'completed' FOR UPDATE OF match` or use a PostgreSQL advisory lock keyed on `phase_id` to ensure only one advancement runs at a time:

```sql
SELECT pg_advisory_xact_lock(hashtext($phase_id));
```

**Warning signs:**
- Phase advanced to next round but some qualifier slots are empty
- Duplicate rows in `match` for the same `advances_to_match_id` + `advances_to_slot`
- Intermittent errors only when two admins enter results close together

**Phase to address:** Result entry phase, match generation phase (schema must enforce uniqueness on `advances_to_match_id` + `advances_to_slot`)

---

### Pitfall 4: Tournament Launch — Non-Atomic Match Generation

**What goes wrong:**
Tournament launch generates all matches for all phases across all tournaments in an event. If generation partially fails (network timeout, constraint violation on match N out of 300), the tournament is left in a half-generated state: some matches exist, others do not. Re-launching may attempt to create duplicates.

**Why it happens:**
Match generation iterates in application code, inserting one match (or batch) at a time without wrapping the entire generation in a single database transaction.

**How to avoid:**
Wrap the entire launch operation in a single transaction. Generate all matches in memory first (pure TypeScript), then insert everything in one transaction with a single batch `INSERT`. Use `status = 'draft'` on the tournament until the transaction commits, then flip to `status = 'active'` as the last step inside the same transaction. This makes launch atomic: it either fully succeeds or fully rolls back.

Also use a PostgreSQL advisory lock (`pg_advisory_xact_lock`) keyed on the tournament ID to prevent double-launches if an admin clicks the button twice or two requests race.

**Warning signs:**
- Tournament shows as "active" but some rounds have no matches
- Re-launching a tournament throws unique constraint violations
- Match count is inconsistent across phases

**Phase to address:** Tournament launch phase

---

### Pitfall 5: Bracket BYE — Odd Player Counts Without BYE Normalization

**What goes wrong:**
The organizer creates a single-elimination bracket for 12 players. The system picks 16 as the bracket size (next power of 2), generating 16 slots. The 4 BYE slots must be distributed against the top 4 seeds, so seeds 1-4 get a free first-round win. If BYEs are not placed in the correct positions (top of each bracket quarter), they cluster on one side, creating an imbalanced bracket where half the field plays a real match in round 1 and the other half waits.

**Why it happens:**
Naive implementation places BYEs sequentially (slots 13, 14, 15, 16 all receive BYE), rather than distributing them using the standard seed-interleaving algorithm.

**How to avoid:**
Use the standard seed placement formula for power-of-2 brackets. The canonical placement order for 16 seeds is: `[1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2]`. BYE "teams" occupy the last N positions in this ordering. Implement as a pure function that takes `(registrations: Team[], bracketSize: number) → SlottedMatch[]`. Write unit tests for all odd counts from 3 to 31.

Also decide: a BYE match auto-advances immediately. The `advances_to_match_id` link must be set at generation time. The BYE match row should be created with `status = 'completed'` immediately at launch so phase advancement logic does not wait for it.

**Warning signs:**
- All BYE matches are on the same side of the bracket
- Round 2 has mismatched numbers of "real" matches vs. waited players
- The unit test suite has no odd-count bracket test cases

**Phase to address:** Match generation phase

---

### Pitfall 6: Double Elimination — Losers Bracket Seeding Causes Immediate Rematches

**What goes wrong:**
In the losers bracket, teams dropped from the winners bracket are seeded into positions. If the algorithm naively places them in sequential order, a team that just lost to their opponent in the winners bracket can immediately face that same opponent in the losers bracket — a rematch in round 1 of losers, which is widely considered unfair.

**Why it happens:**
Losers bracket seeding requires anti-rematch logic that mirrors winners bracket positions into losers bracket slots using a specific interleaving. This is non-obvious and not implicit in a simple sequential assignment.

**How to avoid:**
Follow the standard double-elimination structure where losers from winners round N feed into losers bracket at positions designed to avoid immediate rematches with the player they just lost to. The standard approach: losers from winners round 1 are placed into the losers bracket in reversed pairs relative to winners bracket positions. Unit test every round transition for a small bracket (8 players) and verify no round-1 losers bracket match is a rematch of a winners bracket match.

**Warning signs:**
- In an 8-player DE bracket, the loser of match W1 faces the same opponent again in L1
- No unit tests exist for losers bracket seeding transitions

**Phase to address:** Match generation phase (double_elim type)

---

### Pitfall 7: Phase Advancement — Count-Based Check Is Unreliable Without Locking

**What goes wrong:**
Phase advancement logic checks: "count of completed matches in this phase = total matches in this phase → advance". Under concurrency (two result entries in quick succession), both transactions read `count = N-1`, both determine the threshold is not yet reached, both write their result, and neither triggers advancement. Or conversely, both read `count = N`, both trigger advancement, creating duplicate phase advancement.

**Why it happens:**
The count-based check and the advancement action are not atomic. Another transaction can change the count between the check and the action.

**How to avoid:**
Use a single atomic SQL pattern — do not COUNT then decide in application code:

```sql
-- Attempt phase advancement only if this match was the last one
UPDATE phase
SET status = 'advancing'
WHERE id = $phase_id
  AND status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM match
    WHERE phase_id = $phase_id
      AND status != 'completed'
  )
RETURNING id;
```

If `RETURNING id` yields a row, this transaction "won" the advancement race and should proceed. If it yields nothing, another transaction already advanced (or matches remain). This single-row atomic update replaces the two-step check+act pattern.

**Warning signs:**
- Phase advances multiple times for the same trigger
- Phase never advances despite all matches being complete
- Phase advancement logic uses a `SELECT COUNT(*)` followed by a conditional `UPDATE` in separate SQL calls

**Phase to address:** Result entry phase, phase advancement logic

---

### Pitfall 8: Referee Auto-Assignment — Player Assigned to Own Match

**What goes wrong:**
The referee assignment algorithm picks any registered player who is not "currently playing" (i.e., not assigned as a competitor in this match). But the check operates on the match's `team_a_id` and `team_b_id` — team IDs, not registration IDs. If the join between team membership and registration is not done correctly, a player can be assigned as referee to their own match.

**Why it happens:**
The match schema stores team references, not player references directly. To check "is this player competing in this match", you must join `team_member → team → match`. A simpler but incorrect implementation checks only `referee_id != team_a_id AND referee_id != team_b_id` (comparing registration IDs to team IDs, which never match).

**How to avoid:**
Enforce a database-level constraint and an application-level check:

1. Application level: referee selection query must explicitly exclude players whose registration ID appears in any `team_member` row linked to `team_a_id` or `team_b_id` of this match.
2. Database level: add a CHECK or trigger that validates `referee_id` is not a member of either competing team.

Also ensure the referee availability check accounts for concurrent matches in the same time slot — a referee cannot officiate two matches simultaneously.

**Warning signs:**
- Referee assignment works for simple (1-player team) matches but breaks for doubles
- No database constraint prevents a referee from being in both competitor and referee roles on the same match
- Integration tests only test singles categories

**Phase to address:** Match generation / referee assignment phase

---

### Pitfall 9: Round-Robin Standings — Three-Way Tie Tiebreaker Logic Omitted

**What goes wrong:**
Group standings calculation applies tiebreakers correctly for two-team ties (head-to-head result, then legs difference) but fails for three-or-more-team ties. Three teams with identical records (A beat B, B beat C, C beat A — the "circle of death") are not separable by head-to-head alone. The system either crashes, produces arbitrary ordering, or silently picks the wrong qualifier.

**Why it happens:**
Two-team tiebreaker logic is easy to implement and test. Three-team circular tiebreakers require a separate sub-ranking pass over only the tied teams' mutual results, which is a non-trivial recursive/iterative procedure.

**How to avoid:**
Define a complete tiebreaker chain before implementation, in federation rule order. For a darts federation, this is typically: (1) points, (2) head-to-head points among tied teams, (3) legs difference in head-to-head matches among tied teams, (4) total legs difference in all group matches, (5) drawing of lots. Implement as a pure function with unit tests covering the three-way circle-of-death scenario explicitly.

**Warning signs:**
- Standings calculation only tested with two-way ties
- Tiebreaker logic uses JavaScript `sort()` with a comparator that is not transitive (yields inconsistent sort for N>2 ties)
- "Drawing of lots" fallback is not implemented, leaving the system to produce arbitrary order

**Phase to address:** Standings calculation phase

---

### Pitfall 10: Tournament Configuration Lock — Mutations After Launch

**What goes wrong:**
An organizer edits a tournament (adds a player, changes phase configuration) after the tournament has been launched and matches generated. The edit succeeds at the API layer but the generated match structure is now inconsistent with the configuration. Matches referencing deleted players, or phases with wrong sizes.

**Why it happens:**
The "lock on launch" rule is enforced in the UI (wizard becomes read-only) but the server route accepts the mutation without checking tournament status.

**How to avoid:**
Every server route that mutates tournament configuration (player registration, phase config, tournament settings) must check `tournament.status != 'active'` and return `error(409)` if already launched. This check must be in the server route, not just in the UI. Add a database-level constraint: a `CHECK` trigger on the `match` table referencing `tournament.status`, or an application pattern where the transaction verifies status before any mutation.

**Warning signs:**
- Configuration edit routes do not read `tournament.status` before writing
- Integration tests only test the happy path (pre-launch edits)
- Admin "override" mode allows post-launch edits without a documented cancellation/restart flow

**Phase to address:** Tournament persistence phase, tournament launch phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `SELECT FOR UPDATE` on result entry | Simpler code, no transaction overhead | Rare but real race conditions under concurrent load | Never — a darts tournament table has multiple admins |
| Store standings as a materialized view instead of computing on-demand | Fast reads | Stale data if view is not refreshed after every match | Acceptable only if refresh is triggered immediately after each result |
| Hard-code tiebreaker rule order in standings logic | Simple implementation | Requires code change if federation changes rules | Acceptable for v1.0, extract to config in v1.1 |
| Use `event.locals.user` checks only in load functions, not in `+server.ts` | Less boilerplate | Server routes are wide open to authenticated-but-unauthorized requests | Never |
| Place referee availability check only in application code, not in DB | Faster implementation | Data integrity depends on all code paths going through that one check | Never for the "no self-referee" constraint |
| Generate matches one-by-one in a loop without a wrapping transaction | Simpler error handling | Partial generation leaves corrupt state | Never — wrap in a transaction always |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Better Auth + SvelteKit | Assuming `svelteKitHandler` populates `event.locals` | Manually call `auth.api.getSession()` and assign in `hooks.server.ts` |
| Better Auth + raw SQL | Running Better Auth CLI migration then manually editing the SQL file | Run CLI to generate `.sql`, commit as a migration file, do not mix with custom schema changes in the same file |
| Better Auth admin plugin | Using the admin plugin's built-in roles for tournament-specific roles | Use the admin plugin for global roles (federal_admin, global_organizer) and implement tournament-scoped roles in a custom `tournament_member` table |
| PostgreSQL + raw SQL + transactions | Forgetting to call `COMMIT` / using auto-commit mode for multi-step operations | Explicitly `BEGIN` / `COMMIT` in the `packages/db` helper; never use implicit transactions for multi-step writes |
| SvelteKit form actions + mutation | Using `formData` parsing without validation — no type safety | Use `zod` (or equivalent) to parse and validate all form/API payloads in server routes before touching the database |
| SSE + SvelteKit | Not cleaning up connections when client navigates away | Detect `request.signal.aborted` inside the `ReadableStream` controller and cancel; avoid open connections that accumulate in memory |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Computing standings by scanning all matches on every page load | Slow standings page as match count grows | Compute standings in a transaction-scoped function called once after each result update; cache result in a `phase_standing` table | At ~100+ matches in a phase |
| Fetching all registered players to pick a referee (no index on `tournament_id`) | Slow referee assignment at launch | Add index on `registration(tournament_id)`, filter early in SQL | At ~200+ registrations |
| SSE broadcasting by polling the database every N seconds | High DB load under concurrent viewers | Use PostgreSQL `LISTEN/NOTIFY` via `postgres` v3 channel (already in the stack) to push notifications only on changes | At ~20+ concurrent SSE connections |
| N+1 queries in the match dashboard (one query per match to get team names) | Dashboard slow as match count grows | Use a JOIN in the match list query to fetch team and player names in a single query | At ~50+ matches on the dashboard |
| Match generation inserting rows one by one | Launch takes several seconds for large tournaments | Batch insert all matches in a single multi-row `INSERT ... VALUES (…), (…)` | At ~100+ matches per tournament |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Checking authorization only in UI, not in server routes | Any authenticated user can submit results for any tournament via direct API call | Always check `tournament_admin` role (or equivalent) in every `+server.ts` route that mutates match data |
| Exposing internal database IDs (UUIDs) in SSE streams without access control | Unauthorized users subscribe to SSE and receive live match data for private tournaments | SSE endpoints must verify the user is registered in the tournament or the tournament is public before starting the stream |
| Referee assignment endpoint not verifying the assigning user is a tournament admin | Any player could reassign referees | Server route must check `event.locals.user` has `tournament_admin` role for this specific tournament |
| Not validating `advances_to_match_id` references on result entry | Malformed API request could advance a player into an arbitrary match slot | All phase advancement writes must be done by the system (not user-controlled) — users submit raw scores only, server derives advancement |
| Not rate-limiting the tournament launch endpoint | Admin accidental double-click creates duplicate match generation | PostgreSQL advisory lock keyed on tournament ID prevents concurrent launches; additionally return `409 Conflict` on second request |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No optimistic feedback on result entry | Admin waits for full server round-trip before confirmation; feels slow | Show immediate spinner/success state client-side, confirm via response |
| Launching tournament with zero players registered | System generates bracket with all BYEs; tournament is meaningless | Block launch if registration count is below minimum for the first phase (e.g., must have at least 2 players) |
| Standings page requires manual refresh in v1.0 | Organizer shows standings on screen; viewers see stale data | Add a visible "Last updated: X minutes ago" timestamp so users know when to refresh |
| No clear indicator that tournament is locked after launch | Organizer tries to edit configuration, gets a cryptic error | Show a locked badge and disable all edit controls once tournament status = 'active'; surface a clear message |
| Referee shown as "available" even if they're already assigned elsewhere in the same time block | Referee overloaded; real-world conflict | Referee availability query must filter by time slot overlap, not just by tournament registration |
| Phase advancement not visible in real time | Admin enters final result; nothing appears to happen before standings appear | Show a "Phase complete — generating next round" transient state |

---

## "Looks Done But Isn't" Checklist

- [ ] **Better Auth session:** `event.locals.user` is typed in `app.d.ts` and populated in `hooks.server.ts` — verify with a server-only route that returns `403` when unauthenticated
- [ ] **Route protection:** Every `+server.ts` that mutates data checks role, not just `+layout.server.ts` — verify by calling the endpoint directly with a valid cookie but wrong role
- [ ] **Match generation:** BYE matches are created with `status = 'completed'` at launch, not `pending` — verify that a 12-player bracket has 4 auto-completed BYE matches immediately after launch
- [ ] **Phase advancement:** The advancement SQL uses an atomic update pattern, not a COUNT then UPDATE — verify under concurrent result entry in a test harness
- [ ] **Referee constraint:** Database-level constraint or trigger prevents referee = competitor on same match — verify by attempting to insert a match where `referee_id` is a member of `team_a`
- [ ] **Post-launch lock:** Attempting to edit phase configuration via direct API call after launch returns `409`, not `200` — verify with an integration test that skips the UI
- [ ] **Tiebreaker completeness:** Three-way circle-of-death is handled without crashing — verify with a unit test: A beat B, B beat C, C beat A, equal legs everywhere
- [ ] **Double-elimination seeding:** No losers-bracket round produces an immediate rematch of a winners-bracket match — verify with an 8-player DE bracket unit test tracing all round transitions

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Partial match generation (no transaction) | HIGH | Manual SQL deletion of all matches for the tournament, fix generation code, re-launch |
| Phase advanced twice (duplicate slots) | HIGH | Manual SQL cleanup of duplicate `match` rows, verify `advances_to_match_id` integrity, restart phase |
| Referee assigned to own match | LOW | Admin reassigns referee via admin panel; add missing DB constraint |
| Standings wrong due to missing tiebreaker | MEDIUM | Fix tiebreaker function, recompute standings from match data (non-destructive, data is intact) |
| Session not populated in locals (auth broken) | LOW | Add the `getSession()` call to `hooks.server.ts`; no data loss |
| Tournament launched with wrong configuration | HIGH | No clean rollback path — must cancel all matches, reset tournament to draft, re-configure, re-launch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `event.locals` not populated | Auth integration phase | Integration test: unauthenticated request returns 401, not 500 |
| Route protection gaps | Auth phase + every server route phase | Direct API call with wrong role returns 403 |
| Concurrent result entry race | Result entry phase | Concurrent test: two simultaneous writes to different matches in same phase, verify single advancement |
| Non-atomic match generation | Tournament launch phase | Kill the process mid-generation; verify clean rollback or no partial state |
| BYE placement imbalance | Match generation phase | Unit tests for all bracket sizes 3–31 |
| Double-elimination immediate rematches | Match generation phase | 8-player DE unit test tracing round transitions |
| Phase advancement double-trigger | Result entry phase | Concurrent request test against phase advancement endpoint |
| Referee self-assignment | Match generation / referee assignment phase | Integration test attempting to assign referee who is a competitor |
| Three-way tiebreaker crash | Standings calculation phase | Unit test: circle-of-death scenario with equal points and legs |
| Post-launch mutation | Tournament launch phase + all mutation routes | Integration test: edit phase config after launch, expect 409 |

---

## Sources

- [Better Auth SvelteKit Integration Docs](https://www.better-auth.com/docs/integrations/svelte-kit)
- [Better Auth Issue #2188 — svelteKitHandler does not populate event.locals](https://github.com/better-auth/better-auth/issues/2188)
- [Better Auth Discussion #3406 — hooks/locals vs getSession](https://github.com/better-auth/better-auth/discussions/3406)
- [SvelteKit Discussion #3911 — Recommended approach for Auth Guard](https://github.com/sveltejs/kit/discussions/3911)
- [SvelteKit Issue #7267 — Protected Routes Best Practice](https://github.com/sveltejs/kit/issues/7267)
- [Protected Routes in SvelteKit — Don't Use +layout.server.ts](https://gebna.gg/blog/protected-routes-svelte-kit)
- [PostgreSQL Explicit Locking Documentation](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Using PostgreSQL Advisory Locks to Avoid Race Conditions — FireHydrant](https://firehydrant.com/blog/using-advisory-locks-to-avoid-race-conditions-in-rails/)
- [Preventing Postgres SQL Race Conditions with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)
- [Round-Robin Tournament — Wikipedia (BYE handling for odd players)](https://en.wikipedia.org/wiki/Round-robin_tournament)
- [Bracket (tournament) — Wikipedia (BYE placement, power-of-2)](https://en.wikipedia.org/wiki/Bracket_(tournament))
- [Double-elimination tournament — Wikipedia (losers bracket seeding)](https://en.wikipedia.org/wiki/Double-elimination_tournament)
- [Tiebreaker Rules for Round Robin Tournaments — PrintYourBrackets](https://www.printyourbrackets.com/tiebreaker-in-round-robin-tournaments.html)
- [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)

---
*Pitfalls research for: Tournament management platform — darts federation*
*Researched: 2026-02-28*
