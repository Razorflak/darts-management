# Project Research Summary

**Project:** Darts Management — Tournament Platform
**Domain:** Sports tournament management (fléchette traditionnelle federation)
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

This is a brownfield full-stack SvelteKit project building a tournament management platform for a French traditional darts federation. A frontend prototype already exists covering event creation, multi-tournament configuration, phase setup, and publish preview — but there is zero backend persistence, no auth, and no match lifecycle. The task is to build the complete backend layer that turns the prototype into a production platform capable of running an actual tournament from registration through final standings.

The recommended approach is a SvelteKit server-centric architecture: form actions for all mutations, raw SQL query functions for DB access (mandated by project conventions), and pure TypeScript generation functions for bracket and round-robin algorithms. Better Auth v1.4.x is the only viable auth choice — Lucia v3 was deprecated in March 2025. The core data model relies on a "generate all matches at launch" pattern with `advances_to_match_id` pre-wired graph edges, enabling a complete day-view dashboard and future scheduling optimization. Teams are always represented as teams even in singles (1-member teams), which unifies the entire match pipeline regardless of category.

The key risks are concentrated in three areas: (1) authentication/authorization correctness — Better Auth does not auto-populate `event.locals`, and layout-level guards do not protect API routes; (2) concurrency — concurrent result entries can cause duplicate phase advancement without `SELECT FOR UPDATE` and atomic SQL patterns; (3) algorithm correctness — BYE placement in elimination brackets, double-elimination loser bracket seeding, and three-way tiebreaker logic all have non-obvious edge cases that must be unit-tested before integration. Addressing these early in the implementation sequence avoids high-recovery-cost failures later.

---

## Key Findings

### Recommended Stack

The project's existing stack (SvelteKit, PostgreSQL, TypeScript, pnpm monorepo, raw SQL via `packages/db`) is the correct foundation and should not change. The single forced addition is **Better Auth v1.4.x** for authentication — Lucia v3 was officially deprecated in March 2025 and must not be used. Better Auth integrates via `svelteKitHandler` in `hooks.server.ts` and works with the existing `postgres` driver without an ORM.

Real-time updates are handled with native SSE (`ReadableStream` + `EventSource`) — no external dependency, no WebSocket infrastructure. Bracket and round-robin generation are implemented as pure TypeScript functions (no external bracket library — `brackets-manager.js` has a conflicting data model and should be used only as reference, not as a dependency).

**Core technologies:**
- **Better Auth v1.4.x:** Authentication — only viable option after Lucia v3 deprecation; PostgreSQL-first, SvelteKit-native integration
- **Native SSE (SvelteKit):** Real-time updates — zero dependency, sufficient for admin-driven update frequency; deferred to v1.1
- **Pure TypeScript generation functions:** Match generation — no external bracket library; Berger (~50 lines), elimination (~100 lines); trivially testable
- **`postgres` v3 + `sql.begin()`:** Transactions — already in `packages/db`; supports `LISTEN/NOTIFY` for future SSE optimization
- **Prisma Migrate (migration tooling only):** Schema management — generates `.sql` files compatible with project's raw SQL convention; Better Auth CLI outputs compatible migration

**Critical version note:** Lucia v3 is deprecated. Do not introduce it.

---

### Expected Features

The existing prototype covers wizard UI only. The full v1.0 feature set is a complete tournament lifecycle from persistence through final standings. The feature dependency chain is strictly linear: Auth → Entity Hierarchy → Wizard Persistence → Registration → Launch → Match Generation → Result Entry → Standings/Advancement.

**Must have (table stakes — v1.0):**
- Wizard persistence (event + tournaments → PostgreSQL)
- Authentication with roles: organisateur, admin tournoi, joueur, admin fédéral
- Federation entity hierarchy (Fédération > Ligues > Comités > Clubs) with scoped access
- Player registration: self-registration + manual add, quota enforcement
- Check-in jour J: configurable per tournament, marks present/absent before launch
- Tournament launch + lock: irreversible, triggers match generation, requires validation
- Match generation at launch: round-robin (Berger), single elimination, double elimination with BYE handling
- Referee auto-assignment at generation time (no play/referee conflict in same match)
- Configurable set/leg format per phase (sets_to_win, legs_per_set)
- Result entry by admin du tournoi with server-side score validation
- Walkover/forfeit marking (shares advancement code path)
- Automatic phase advancement via pre-wired `advances_to_match_id` graph
- Group → bracket seeding on phase completion (poules → tableau)
- Standings for group phases: wins/losses/legs diff with tiebreaker chain
- Read-only bracket view for elimination phases
- Dashboard de la journée: all matches across all tournaments, status overview

**Should have (differentiators — competitive advantage over Challonge/Toornament):**
- Multi-tournament-per-event architecture (already modeled in wizard; no generic tool supports this)
- Federation hierarchy scoped access (unique to this context)
- "Generate all matches at launch" model (enables complete day dashboard; no generic tool does this)
- Paper scorecard workflow UX (admin-only entry, pre-filled match forms)
- Phase chaining group → bracket with federation-standard anti-seeding rules

**Defer to v1.1:**
- SSE real-time updates (bracket view, standings, dashboard) — already designed, trivial to add
- Licencié DB lookup for registration validation
- Audit log for result corrections

**Defer to v2+:**
- Scheduling optimization (court/time slot assignment)
- Live scoring from tablets
- Player ratings/seeding from historical results
- Waitlist management
- Templates stored in DB

**Do not build:**
- ORM runtime (project mandates raw SQL)
- WebSocket infrastructure (SSE is sufficient)
- Full licencié/club CRM (different domain, different data model)
- Self-service player result entry (dispute resolution complexity out of scope)

---

### Architecture Approach

The architecture is a SvelteKit monolith with clear server/client separation: all DB access is confined to `$lib/server/` (never imported by client components), form actions handle all mutations, and pure TypeScript generation functions are isolated from DB concerns. Route groups `(auth)/` and `(app)/` handle layout separation and authentication gating. Authorization (role checks) is per-route in each `+page.server.ts`, never in layout files.

The federal hierarchy is modeled as a self-referential `entity` table with a `user_role(user_id, entity_id, role)` join table — not Better Auth's built-in role field, which is single-value and insufficient for per-entity roles. Match generation is pure-TS in memory, then bulk-inserted in a single `sql.begin()` transaction at launch.

**Major components:**
1. `hooks.server.ts` — Auth interception (`svelteKitHandler`), session → locals population, route authentication guard
2. `$lib/server/auth.ts` — Better Auth instance, role definitions
3. `$lib/server/db/` — Raw SQL query functions by domain (events, hierarchy, registrations, matches, standings)
4. `$lib/server/generation/` — Pure TS match generation: `berger.ts`, `elimination.ts`, `index.ts`
5. `$lib/server/standings/` — Pure TS standings calculation (round-robin, elimination)
6. Route `(app)/` — Authenticated route group: wizard persistence, event management, registration, dashboard, match entry
7. `packages/db/` — Unchanged postgres driver; transaction support via `sql.begin()`

**Key data flows:**
- **Creation:** Wizard JSON payload → form action → `createEventWithTournaments()` → single `sql.begin()` transaction → redirect to event page
- **Launch:** Registrations + phase config → pure generation functions → `insertAllMatches()` bulk transaction → event status `live`
- **Result entry:** Score form → validate → `UPDATE match` + `SELECT advances_to_match_id` + conditional `UPDATE team_a/b_id` → atomic phase advancement check — all in one transaction

---

### Critical Pitfalls

The research identified 10 pitfalls. The following 5 carry the highest recovery cost if missed:

1. **Better Auth `event.locals` not auto-populated** — `svelteKitHandler` does not inject session data. Must manually call `auth.api.getSession()` in `hooks.server.ts` and assign to `event.locals`. Every server route that relies on auth will silently fail without this. Address in Phase 1 (auth integration).

2. **Route protection gaps — layout guards don't protect API routes** — SvelteKit runs load functions in parallel; a redirect in `+layout.server.ts` does not block `+server.ts` routes. Route guards must live in `hooks.server.ts` (authentication) and in each action/route handler (authorization). Address in Phase 1 and every phase introducing new server routes.

3. **Non-atomic match generation — partial launch leaves corrupt state** — All match inserts must be wrapped in a single `sql.begin()` transaction. If generation is iterative without a wrapping transaction, a mid-way failure leaves the tournament half-generated with no clean rollback. Use `pg_advisory_xact_lock` on tournament ID to prevent double-launches. Address in Phase 4 (launch).

4. **Concurrent result entry — double phase advancement** — Two admins entering results simultaneously can both pass the phase completion check, triggering duplicate advancement. Use `SELECT ... FOR UPDATE` on match rows plus an atomic `UPDATE phase ... WHERE NOT EXISTS (incomplete matches) RETURNING id` pattern. Address in Phase 5 (result entry).

5. **BYE placement and double-elimination seeding** — Naive sequential BYE placement creates imbalanced brackets. Loser bracket seeding without anti-rematch logic creates immediate rematches in round 1 of losers. Both must be implemented as pure functions with comprehensive unit tests (all bracket sizes 3–31 for single-elim; 8-player full-path test for double-elim). Address in Phase 4 (match generation).

**Additional pitfalls to address by phase:**
- Phase 3: Post-launch mutation lock (check tournament status in every mutation route, not just UI)
- Phase 5: Three-way tiebreaker logic (circle-of-death scenario; must not crash or produce arbitrary results)
- Phase 4: Referee self-assignment (join-based check, not team-ID comparison; enforce at DB level)

---

## Implications for Roadmap

The dependency chain in FEATURES.md and the build order from ARCHITECTURE.md both converge on the same implementation sequence. The suggested phases below follow this chain directly.

### Phase 1: Foundation — Auth, DB Schema, Entity Hierarchy

**Rationale:** Auth is required by every subsequent feature. The DB schema must exist before any server code is written. The federal hierarchy entity model is required for wizard persistence (events are owned by an entity). This is the true blocker for everything else.

**Delivers:** Working authentication (login/register), session propagation to all server routes, federation entity hierarchy with basic CRUD, user-role assignment per entity, route guard infrastructure.

**Addresses features from FEATURES.md:**
- Authentication (Better Auth v1.4.x) with roles
- Federation hierarchy (Fédération > Ligues > Comités > Clubs)

**Implements architecture components:**
- `hooks.server.ts` with `sequence(betterAuthHandler, sessionLocalsHandler)`
- `$lib/server/auth.ts`
- `$lib/server/db/hierarchy.ts`
- `(auth)/` route group (login, register pages)
- `(app)/+layout.server.ts` authentication gate
- Full DB schema (Better Auth tables + entity + user_role + all tournament domain tables)

**Pitfalls to prevent:**
- Pitfall 1: `event.locals` population (address immediately in `hooks.server.ts`)
- Pitfall 2: Route protection gaps (establish correct pattern from day 1)
- Pitfall 4 (architecture anti-pattern): Never use Better Auth's `user.role` for per-entity roles

**Research flag:** Standard patterns for Better Auth + SvelteKit are well-documented in STACK.md and ARCHITECTURE.md. Skip `/gsd:research-phase` for this phase.

---

### Phase 2: Wizard Persistence

**Rationale:** Directly continues the existing wizard prototype. Depends on auth (organizer identity) and hierarchy (entity ownership). The wizard UI already exists; this phase wires it to a real form action and DB insert. Relatively low complexity, high immediate value — turns the prototype into a real product for the first time.

**Delivers:** Event + tournament + phase configurations saved to PostgreSQL. Event list and detail pages. Entity selector in wizard populated from DB.

**Addresses features from FEATURES.md:**
- Wizard persistence (event + tournaments + phases → PostgreSQL)
- Basic event management UI (event list, event detail)

**Implements architecture components:**
- `$lib/server/db/events.ts` (createEventWithTournaments, getEvent, listEvents)
- `routes/(app)/tournaments/new/+page.server.ts` (action:create)
- `routes/(app)/events/` (list and detail pages)
- Wires existing `publish()` to form action (wizard component modifications are minimal)

**Pitfalls to prevent:**
- Pitfall 10: Post-launch mutation lock must be built here — every mutation route checks `event.status` before writing
- Anti-pattern 5: All form inputs validated with Zod before DB writes

**Research flag:** Standard SvelteKit form action patterns. Skip `/gsd:research-phase`.

---

### Phase 3: Player Registration and Check-in

**Rationale:** Registration depends on events existing. Check-in depends on registration. Both are pre-launch operations and share no logic with match generation. Building them here unblocks launch.

**Delivers:** Organizer can add players manually; players can self-register; quota enforced; check-in per tournament on jour J; absent players identified before launch.

**Addresses features from FEATURES.md:**
- Player registration (self-registration + manual add, quota enforcement)
- Check-in jour J (configurable, marks present/absent, gates launch)
- Edge cases: duplicate registration, late registration, quota-exceeded, all-absent group

**Implements architecture components:**
- `$lib/server/db/registrations.ts`
- `routes/(app)/events/[id]/registrations/` (page + server)

**Pitfalls to prevent:**
- Idempotent registration (duplicate prevention)
- Quota check inside transaction to prevent over-registration under concurrent requests

**Research flag:** Standard CRUD with quota logic. Skip `/gsd:research-phase`.

---

### Phase 4: Tournament Launch and Match Generation

**Rationale:** The algorithmically hardest phase. Pure TypeScript generation functions can be developed (and unit-tested) independently of the rest of the system, but DB integration requires registrations to exist. This phase should invest heavily in test coverage before integration.

**Delivers:** Launch action that locks tournament, generates all matches (round-robin Berger, single elimination, double elimination) with BYE handling, assigns referees, and bulk-inserts everything in one transaction. Tournament status transitions to `live`.

**Addresses features from FEATURES.md:**
- Tournament launch + lock with pre-launch validation
- Match generation: round-robin (Berger algorithm), single elimination, double elimination
- BYE handling for all formats
- Referee auto-assignment
- Set/leg format per phase
- Pre-generation of all matches (enables full day dashboard)

**Implements architecture components:**
- `$lib/server/generation/berger.ts`
- `$lib/server/generation/elimination.ts`
- `$lib/server/generation/index.ts`
- `$lib/server/db/matches.ts` (insertAllMatches bulk transaction)
- `routes/(app)/events/[id]/launch/+page.server.ts` (action:launch)

**Pitfalls to prevent:**
- Pitfall 4: Entire launch wrapped in `sql.begin()` — atomic, no partial state
- Pitfall 4: `pg_advisory_xact_lock(tournament_id)` prevents double-launch
- Pitfall 5: Canonical seed-placement formula for BYE distribution in elimination brackets; BYE matches created with `status = 'completed'` at launch
- Pitfall 6: Anti-rematch loser bracket seeding for double elimination
- Pitfall 8: Referee assignment via join-based query (registration → team_member → team → match), DB-level constraint

**Research flag:** Algorithm correctness (BYE placement formula, double-elim seeding) has non-obvious edge cases. **Recommend `/gsd:research-phase`** before implementation to produce unit test specifications for all bracket sizes.

---

### Phase 5: Result Entry, Standings, and Phase Advancement

**Rationale:** Depends entirely on matches existing in DB. This phase closes the tournament lifecycle loop. The three components (result entry, standings calculation, phase advancement) are tightly coupled and should be built together to avoid integration surprises.

**Delivers:** Admin can enter match results; winners advance to next match automatically; group standings calculated with tiebreaker chain; group → bracket seeding on phase completion; walkover/forfeit handling; bracket view for elimination phases.

**Addresses features from FEATURES.md:**
- Result entry by admin du tournoi (score validation against format)
- Automatic phase advancement (advances_to_match_id traversal)
- Group → bracket seeding on group phase completion
- Standings for group phases (wins/losses/legs diff, complete tiebreaker chain)
- Read-only bracket view for elimination phases
- Walkover/forfeit handling (same advancement code path)

**Implements architecture components:**
- `$lib/server/standings/round-robin.ts`
- `$lib/server/standings/elimination.ts`
- `routes/(app)/events/[id]/matches/[matchId]/` (result entry page + server)
- `routes/(app)/events/[id]/dashboard/` (day dashboard)

**Pitfalls to prevent:**
- Pitfall 3: `SELECT ... FOR UPDATE` on match row; atomic `UPDATE phase ... WHERE NOT EXISTS` advancement pattern
- Pitfall 7: Phase advancement count check must be atomic SQL (not COUNT then UPDATE in application code)
- Pitfall 9: Three-way circular tiebreaker (A beat B, B beat C, C beat A) must not crash or produce arbitrary order; define and implement full tiebreaker chain before writing code

**Research flag:** Tiebreaker chain order is FFD-specific and has LOW confidence (not verified against FFD règlement). **Recommend `/gsd:research-phase`** to verify tiebreaker order with federation rules before implementation. BYE result treatment (win vs. no-result in round-robin) also needs FFD clarification.

---

### Phase 6: SSE Real-Time Updates (v1.1)

**Rationale:** Deferred from v1.0 by design. The architecture already anticipates this: SSE endpoint is pre-designed in ARCHITECTURE.md, `EventSource` replaces manual refresh in client. Adding SSE after Phase 5 is a drop-in enhancement with no data model changes.

**Delivers:** Dashboard and bracket views update in near-real-time without manual refresh. PostgreSQL `LISTEN/NOTIFY` for push-based DB notifications.

**Addresses features from FEATURES.md:**
- SSE temps réel (dashboard, bracket view, standings)

**Implements architecture components:**
- `routes/api/events/[id]/sse/+server.ts`
- Client-side `EventSource` in dashboard and bracket pages

**Pitfalls to prevent:**
- SSE connection cleanup on client navigation (`request.signal.aborted`)
- PostgreSQL `LISTEN/NOTIFY` via `postgres` v3 `sql.listen()` to avoid polling

**Research flag:** Pattern is well-documented in ARCHITECTURE.md. Skip `/gsd:research-phase`.

---

### Phase Ordering Rationale

- **Auth before everything:** No feature can be built without knowing who the actor is. Every server route depends on `event.locals.user`.
- **Schema before code:** The complete DB schema (Better Auth tables, entity hierarchy, full tournament domain) must be migrated before any query function is written. Define once, migrate once.
- **Hierarchy before wizard persistence:** Events are owned by an entity. The entity selector in the existing wizard is hardcoded and must be replaced with real DB data.
- **Registration before launch:** Launch requires knowing which players are registered and checked in.
- **Generation as pure functions first, integration second:** The Berger and elimination algorithms should be fully unit-tested before the launch action is built. The pure functions have no DB dependency.
- **Result entry and standings together:** Phase advancement logic touches both match results and standings triggers. Building them separately risks integration gaps.
- **SSE last:** No data model dependency. Pure enhancement layer.

### Research Flags

**Phases requiring `/gsd:research-phase` during planning:**
- **Phase 4 (Match Generation):** BYE placement canonical seed formula and double-elimination anti-rematch seeding both have well-known but non-trivial implementations. Research should produce a test specification (all bracket sizes 3–31 for single-elim; full 8-player DE path test) before implementation begins.
- **Phase 5 (Standings):** FFD tiebreaker chain order is not verified against the FFD règlement. LOW confidence on: (a) tiebreaker order (head-to-head → legs diff → legs for — generic sports rule, not federation-specific), (b) BYE result treatment in round-robin (win vs. no-result), (c) three-way tie resolution protocol. These need federation rule validation before implementation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Auth + Schema):** Better Auth + SvelteKit integration is well-documented; STACK.md and ARCHITECTURE.md provide complete code examples.
- **Phase 2 (Wizard Persistence):** Standard SvelteKit form action + SQL pattern. Existing wizard structure is already analyzed.
- **Phase 3 (Registration):** Standard CRUD with quota logic. No novel patterns.
- **Phase 6 (SSE):** Drop-in pattern already designed in ARCHITECTURE.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Better Auth deprecation is a critical but well-documented finding; remaining stack is the existing codebase |
| Features | HIGH (domain) / LOW (FFD rules) | Feature set is well-understood from codebase analysis and competitor review; FFD-specific tiebreaker rules and BYE treatment not verified against FFD règlement |
| Architecture | HIGH | Official SvelteKit + postgres docs + existing codebase analysis; all patterns verified |
| Pitfalls | HIGH (auth, concurrency, SQL) / MEDIUM (bracket algorithms) | Auth and concurrency pitfalls sourced from official docs and verified GitHub issues; bracket algorithm pitfalls sourced from Wikipedia and tournament software docs |

**Overall confidence:** HIGH for architecture and stack decisions. Specific gaps exist for federation-specific rules.

### Gaps to Address

- **FFD tiebreaker order:** Not verified against FFD règlement. Assume standard head-to-head → legs difference → legs for, but flag for validation with federation before Phase 5 implementation. If incorrect, tiebreaker logic is isolated in `$lib/server/standings/round-robin.ts` and can be updated without touching other code.
- **BYE result treatment in round-robin:** FFD may treat a BYE as an automatic win or as a no-result (not counted). Affects standings calculation. Flag for validation before Phase 4/5.
- **Three-way tie protocol:** Standard tiebreaker algorithm is known (sub-ranking among tied teams), but federation may have a "drawing of lots" rule or a playoff match rule for equal tiebreakers. Flag for validation; implement as a configurable fallback ("flag for organizer decision" is acceptable for v1.0).
- **Licencié DB integration:** v1.0 uses manual verification by organiser. The API integration point (FFD member database lookup) is out of scope and not researched. Flag as a Phase v1.1 external dependency requiring federation coordination.

---

## Sources

### Primary (HIGH confidence)
- `packages/front/src/lib/tournament/` (existing codebase) — wizard types, phase model, component structure
- `packages/db/` (existing codebase) — postgres driver, transaction API
- [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions) — form action patterns
- [SvelteKit Routing](https://svelte.dev/docs/kit/routing) — route group patterns
- [postgres.js transaction API](https://github.com/porsager/postgres) — `sql.begin()` API
- `PROJECT.md` — explicit feature requirements and domain constraints

### Secondary (MEDIUM confidence)
- [Better Auth SvelteKit Integration](https://www.better-auth.com/docs/integrations/svelte-kit) — auth handler integration
- [Better Auth Issue #2188](https://github.com/better-auth/better-auth/issues/2188) — `event.locals` not auto-populated finding
- [Protected Routes in SvelteKit](https://gebna.gg/blog/protected-routes-svelte-kit) — layout guard anti-pattern
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) — `SELECT FOR UPDATE` and advisory locks
- [Double-elimination tournament — Wikipedia](https://en.wikipedia.org/wiki/Double-elimination_tournament) — loser bracket seeding rules
- [Round-robin tournament — Wikipedia](https://en.wikipedia.org/wiki/Round-robin_tournament) — Berger algorithm, BYE handling
- [Toornament Knowledge Base](https://help.toornament.com) — check-in and phase advancement patterns
- [PostgreSQL LISTEN/NOTIFY with SvelteKit SSE](https://gornostay25.dev/post/postgresql-listen-notify-sveltekit) — SSE push pattern

### Tertiary (LOW confidence — needs validation)
- FFD tiebreaker order (head-to-head → legs diff → legs for): generic sports rule, not verified against FFD règlement
- BYE result treatment in round-robin (win vs. no-result): FFD-specific, not verified
- Three-way tie resolution (circular head-to-head): standard algorithm known; federation-specific fallback not verified

---

*Research completed: 2026-02-28*
*Ready for roadmap: yes*
