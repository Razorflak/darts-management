# Feature Research

**Domain:** Tournament management platform — darts federation (fléchette traditionnelle)
**Researched:** 2026-02-28
**Confidence:** HIGH (domain well-understood; specific darts federation rules LOW unless verified with FFD)

---

## Context: What Is Already Built

The wizard prototype covers event creation through publication configuration. It is **not yet persisted**. Everything below is what needs to be built for v1.0 to deliver a complete end-to-end tournament.

**Already built (prototype, not persisted):**
- Wizard de création d'événement (name, entity, dates, location)
- Multi-tournament configuration per event (one per category)
- Phase configuration: round_robin, double_loss_groups, single_elim, double_elim
- Template system, drag-and-drop phase ordering, publish preview

**Gap:** Zero backend. No auth. No persistence. No player management. No match lifecycle.

---

## Feature Landscape

### Table Stakes — Users Expect These

Features the organizer expects on day one. Missing any of these = the platform cannot run an actual tournament.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Wizard persistence** (event → API → PostgreSQL) | Prototypes are useless without saving | MEDIUM | Connects existing wizard to server routes + DB. Validation needed before save. |
| **Authentication (Better Auth v1.4.x)** | Organizers must identify themselves; actions must be gated | MEDIUM | SvelteKit hooks integration, session-based, role-aware |
| **Roles: organisateur, admin tournoi, joueur, admin fédéral** | Different actors need different views and permissions | MEDIUM | Coarse-grained: organisateur creates events, admin tournoi runs them, joueur self-registers, admin fédéral oversees all |
| **Hierarchical entity management (Fédération > Ligues > Comités > Clubs)** | Organizers belong to an entity; events are owned by an entity | HIGH | Tree structure in DB; scoped visibility per role; every event linked to an entity |
| **Player registration (self-registration + manual by organisateur)** | Players must be enrolled before a tournament can be launched | MEDIUM | Licensed players (licenciés) auto-register; organiser can add unlicensed players manually. Quota enforced. |
| **Check-in jour J (configurable, optional per tournament)** | Confirms actual attendance before bracket generation | LOW | Toggle per tournament. Check-in window. Absent = removed or marked no-show before launch. |
| **Tournament launch + lock** | Locks configuration, triggers match generation | MEDIUM | Irreversible action. Requires all validation to pass (min players, phases valid). |
| **Match generation at launch — round-robin (Berger algorithm)** | Core requirement for group phase tournaments | HIGH | Odd-player groups get a BYE slot. All matches generated upfront including BYE matches. Group assignments by seed or random. |
| **Match generation at launch — single elimination** | Core for bracket phases | HIGH | Power-of-2 bracket with BYE padding for non-power-of-2 entrants. `advances_to_match_id` chained at generation time. |
| **Match generation at launch — double elimination** | Core for double-elim bracket phases | HIGH | Winner + loser brackets generated together. Loser seeding avoids immediate rematches. All slots pre-created, participants TBD until results flow in. |
| **Configurable set/leg format per phase** | Règlement fédéral mandates specific formats; may change | LOW | Stored per phase: sets_to_win, legs_per_set. Currently "1 set, X legs" in practice. |
| **Referee auto-assignment** | Required by federation rules; a player in the same tournament acts as referee | HIGH | Assign at match generation time. Hard constraint: referee not playing in the same match. Soft constraint: referee not playing a match at the same time (post-v1 scheduling). |
| **Result entry by admin du tournoi** | Score sheets come from paper forms; admin enters in system | MEDIUM | Simple form: sets/legs scores per set. Validation against format (e.g. can't have 3 sets if format is best-of-3 and first player won first 2). |
| **Automatic phase advancement** | After a match is recorded, winner advances to next match automatically | HIGH | `advances_to_match_id + advances_to_slot` pattern. System fills the slot when result confirmed. For group phase → elimination phase: trigger when all group matches done. |
| **Standings calculation — group phases** | Organizer and players need to see who is advancing | MEDIUM | Wins/losses/legs difference. Tiebreaker order (head-to-head, then legs difference, then legs for). Must be recalculated on every result entry. |
| **Standings/bracket view — elimination phases** | Visual bracket showing who advanced | MEDIUM | Read-only bracket display. No real-time in v1.0 (manual refresh). |
| **Dashboard de la journée** | Organizer needs global view: all matches, statuses, pending results | HIGH | Aggregated view across all tournaments in an event. Match status: pending, in_progress, completed, walkover. Filtering by status. |
| **Walkover / forfeit handling** | Players who don't show up must not block the tournament | MEDIUM | Admin marks a player as absent (no-show). Match is auto-awarded as walkover. Advancement triggered as with a normal result. |

---

### Differentiators — Competitive Advantage

Features that distinguish this platform from generic tools like Challonge or Toornament for the French traditional darts federation context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-tournament-per-event architecture** | One event (journée) = multiple simultaneous tournaments (simples messieurs, doubles dames, open…). Generic tools handle one bracket per event. | HIGH | Already modeled in wizard prototype. Core to the federation's operational model. |
| **Federation hierarchy scoped access** | Clubs, Comités, Ligues, Fédération each see their own events and players. Not possible in generic tools. | HIGH | Every entity can organize, but visibility scoped by hierarchy level. |
| **"Generate all matches at launch" model** | Unlike lazy generation (matches created only when previous round completes), all matches exist from day one. Enables full-day planning view. | HIGH | Unique to this system. Enables future scheduling optimization. `advances_to_match_id` links are pre-established. |
| **Licencié auto-registration** | Players with a valid federation licence (licenciés) can self-register. Verifiable against the federation member database. | MEDIUM | Requires licencié lookup against federation DB (post-v1 integration). In v1.0: manual verification by organiser. |
| **Paper scorecard workflow** | Result entry explicitly designed for paper-to-digital flow, not live scoring. Match-specific form with pre-filled participants and format. | LOW | UX: list of completed paper scorecards waiting for entry. Shows referee assigned. |
| **Set/leg format anticipating rule changes** | The schema is future-proof for multi-set formats even though current rules use 1 set. | LOW | Already in STACK.md. Translates to UX: per-phase format selector. |
| **Phase chaining (group → bracket)** | Automatic seeding of elimination bracket from group phase standings. Top N per group fill bracket positions by seeding rules (1st of group A vs 2nd of group B, etc.). | HIGH | Critical for standard darts tournament structure (poules → tableau). |

---

### Anti-Features — Commonly Requested, Often Problematic

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Live score entry by players (tablet on court)** | Removes admin bottleneck | Reliability nightmare (connectivity, player error, disputes). Out of scope in PROJECT.md. | Paper + admin entry. Explicit in v1.0 design. Add in v2 with proper dispute flow. |
| **Real-time bracket push (WebSockets)** | Instant updates feel modern | WebSocket infra complexity. SSE is sufficient for admin-driven update frequency. | SSE (manual refresh v1.0, SSE v1.1). Already decided in STACK.md. |
| **Automatic scheduling optimization** | Avoid player playing two matches at the same time | Constraint optimization is a hard problem. Cannot be solved well without knowing actual court availability and real durations. | Post-v1. The `advances_to_match_id` model anticipates it. In v1.0: organizer manually manages timing. |
| **Full licencié/club management** | Centralized member database in same app | Different domain (CRM-like), different user stories, very different data model. Risks diluting core tournament flow. | Out of scope. Federation likely has existing systems. API integration point post-v1. |
| **Self-service player result entry** | Reduces admin load | Dispute resolution complexity. Who wins a disagreement? Requires audit trail, admin override, notification system. | Admin-only entry in v1.0. Eliminates entire dispute complexity class. |
| **Waitlist management** | Useful for high-demand tournaments | Complex UX (ordering, notification, acceptance workflow). Low value for internal federation tournaments where organisers control registrations directly. | Manual organisateur decision: add from waitlist or increase quota. |
| **Automatic seeding by player rating/ranking** | Competitive fairness | Requires player ratings database (out of scope v1.0). Organiser doesn't always want optimal seeding. | Manual seeding override or random assignment. Rating system = post-v1. |

---

## Feature Dependencies

```
[Auth + Roles]
    └──required by──> [Tournament Wizard Persistence]
                          └──required by──> [Player Registration]
                                                └──required by──> [Check-in jour J]
                                                └──required by──> [Tournament Launch + Lock]
                                                                      └──required by──> [Match Generation (all formats)]
                                                                                            └──required by──> [Referee Auto-Assignment]
                                                                                            └──required by──> [Dashboard de la journée]
                                                                                                                  └──required by──> [Result Entry]
                                                                                                                                        └──required by──> [Automatic Phase Advancement]
                                                                                                                                        └──required by──> [Standings Calculation]

[Federal Hierarchy]
    └──required by──> [Auth + Roles] (entity scoping)
    └──required by──> [Tournament Wizard Persistence] (event owned by entity)

[Phase Configuration (existing wizard)]
    └──feeds into──> [Match Generation] (round/group counts, bracket sizes, format)
    └──feeds into──> [Standings Calculation] (format-specific leg/set rules)

[Group Phase Match Generation]
    └──required before──> [Elimination Phase Match Generation] (seeds determine bracket slots)

[Phase Chaining (group → bracket)]
    └──requires──> [Standings Calculation] (determines top N qualifiers)
    └──requires──> [Automatic Phase Advancement] (triggers when group complete)

[Walkover / Forfeit]
    └──shares logic with──> [Automatic Phase Advancement] (advancement trigger same code path)
    └──requires──> [Check-in jour J] (absent players identified pre-launch)
```

### Dependency Notes

- **Auth before everything:** No feature can be built without knowing who the actor is and what they're allowed to do. Auth is the true phase 1 foundation.
- **Federal Hierarchy before Wizard Persistence:** The event must be owned by an entity. Entity selection in the wizard (currently hardcoded) requires the hierarchy to exist.
- **Check-in before Launch:** If check-in is enabled, the launch button must be gated behind the check-in window closing. Absent players are removed/marked before match generation.
- **Group Phase Generation before Elimination Generation:** For tournaments with poules → tableau, group matches must complete and standings must identify the qualifiers before bracket slots can be filled. The bracket structure is pre-generated at launch (all slots exist, players TBD), but seeding into bracket slots happens as phases complete.
- **Standings before Phase Chaining:** The advancement from group → bracket needs final standings to know which players fill which bracket seeds.
- **Walkover shares advancement logic:** A walkover is just a result with a special status. The same `advances_to_match_id` traversal that handles normal results handles walkovers. No separate code path needed.

---

## Edge Cases — Critical to Handle Correctly

### Player Registration Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Player registers but quota is full | Reject with clear message. No waitlist in v1.0 — organiser decides. |
| Same player tries to register twice | Idempotent: second registration is a no-op or clear error. |
| Player registered for two simultaneous tournaments (doubles + simples) | Allowed. Scheduling conflicts are organiser's problem (post-v1). |
| Player registered, then tournament config changes (quota reduction) | Config changes blocked after registration opens, OR require organiser to manually remove excess players. |
| Late registration after check-in opens | Configurable: allow or block. Late registrations skip check-in (auto-checked-in, or auto-absent). |

### Check-in Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Player checks in but then leaves before launch | Organiser can manually uncheck-in. |
| No check-in configured for a tournament | All registered players treated as present at launch. |
| Check-in closes and some players absent | System shows absent list. Organiser confirms launch knowing absent players won't participate. Absent players removed from draw. |
| All players in a group absent | Group cannot run. Edge case: organiser may need to merge groups or cancel that tournament. Flag for organiser decision, no auto-resolution. |

### Match Generation Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Odd number of players in a round-robin group | BYE added as phantom player. Berger algorithm assigns BYE opponent each round. A player with a BYE gets a win (or no result, per federation rules — LOW confidence, verify). |
| Non-power-of-2 entrants in elimination bracket | BYEs fill bracket to next power of 2. BYE matches auto-complete as walkovers at generation time, advancing real players immediately. |
| Double elimination: player drops to loser bracket | Loser bracket slot pre-assigned at generation time based on original seeding. Winner of loser bracket advances to Grand Final. |
| Phase with 1 entrant (all others absent) | Cannot generate meaningful matches. Error state: organiser must resolve before launch. |
| Referee is one of the two players in a match | Hard constraint violation. Generator must prevent self-assignment. If no valid referee available (too few players), flag and require organiser input. |
| Player appears in multiple phases as both competitor and referee | Possible by design (referee rotates). Must not be assigned as referee when they have a match at the same round (simplified: don't assign referee to a match in the same round they play). |

### Result Entry Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Score entered for wrong match | Admin can correct result before phase advances. After advancement, correction requires admin override and re-calculation. |
| Disputed score (paper sheet unclear) | No automated resolution. Organiser enters best known result. Audit log records who entered and when. |
| Forfeit mid-match (player withdraws during a match) | Admin records current score as-is, marks as forfeit. If format allows partial set, remaining sets awarded to opponent. |
| Result entered that is mathematically impossible (e.g., 3-3 in best-of-3 legs) | Server-side validation rejects. Frontend validation warns. |
| Same result entered twice | Idempotent if identical. If different, force confirmation with diff shown. |

### Standings / Tiebreaker Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Two players tied on wins/losses | Tiebreaker: head-to-head result, then legs difference, then legs scored. Federation rules may differ — LOW confidence, flag for validation. |
| Three-way tie | Circular head-to-head resolution (A beat B, B beat C, C beat A). System must detect and either apply legs difference or flag for organiser decision. |
| Not enough qualifiers in a group (too many tied for last qualifying spot) | Apply tiebreakers strictly. If still tied, organiser decides or a playoff match is generated. Flag, don't auto-resolve. |
| Group phase results in fewer qualifiers than bracket expects | Bracket slots remain TBD/BYE. Advancement still works — those bracket slots auto-advance their filled opponent. |

### Phase Advancement Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Last match of a group completes | Trigger standings final calculation. Identify qualifiers. Assign to pre-generated bracket slots by seeding rules. |
| Qualifier seeding into bracket (standard darts: 1er poule A vs 2e poule B) | Standard anti-seeding rule. Pre-configured in phase chaining definition. Must be configurable per tournament. |
| Player advances but then is disqualified | Admin must manually intervene. System doesn't handle disqualification automatically in v1.0. |

---

## MVP Definition

### v1.0 — Full Tournament Lifecycle (Current Milestone)

- [ ] Wizard persistence (event + tournaments → PostgreSQL via SvelteKit server routes)
- [ ] Auth (Better Auth v1.4.x) with roles: organisateur, admin tournoi, joueur, admin fédéral
- [ ] Federal hierarchy entities (Fédération > Ligues > Comités > Clubs) — basic CRUD
- [ ] Player registration: self-registration + manual add by organisateur, quota enforcement
- [ ] Check-in jour J: configurable toggle per tournament, mark players present/absent
- [ ] Tournament launch + lock with pre-launch validation (min players, valid phases)
- [ ] Match generation at launch: round-robin (Berger), single elim, double elim, with BYE handling
- [ ] Referee auto-assignment at generation time (no play/referee conflict in same match)
- [ ] Set/leg format configurable per phase (sets_to_win, legs_per_set)
- [ ] Result entry by admin du tournoi (score validation against format)
- [ ] Walkover/forfeit marking by admin
- [ ] Automatic phase advancement (advances_to_match_id traversal on result entry)
- [ ] Group → bracket seeding on group phase completion
- [ ] Standings for group phases (wins/losses/legs diff, tiebreakers)
- [ ] Bracket view for elimination phases
- [ ] Dashboard de la journée: all matches across all tournaments, status overview
- [ ] Manual standings refresh (no SSE in v1.0)

### v1.1 — Add After Core Validated

- [ ] SSE real-time updates (bracket view, standings, dashboard) — already decided in STACK.md
- [ ] Licencié lookup against federation member DB for registration validation
- [ ] Audit log for result corrections
- [ ] Admin-correctable results with re-calculation

### v2+ — Future Consideration

- [ ] Scheduling optimization (court/time slot assignment based on player availability)
- [ ] Inter-club championship (team matches, season standings) — separate domain
- [ ] Live scoring from court tablets
- [ ] Player ratings/seeding from historical results
- [ ] Waitlist management for high-demand events
- [ ] Templates stored in DB (not hardcoded)
- [ ] Player dispute resolution flow for results

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wizard persistence | HIGH | MEDIUM | P1 |
| Auth + Roles | HIGH | MEDIUM | P1 |
| Federal Hierarchy | HIGH | HIGH | P1 |
| Player Registration | HIGH | MEDIUM | P1 |
| Tournament Launch + Lock | HIGH | MEDIUM | P1 |
| Match Generation (round-robin) | HIGH | HIGH | P1 |
| Match Generation (single elim) | HIGH | HIGH | P1 |
| Match Generation (double elim) | HIGH | HIGH | P1 |
| Referee Auto-Assignment | HIGH | HIGH | P1 |
| Result Entry | HIGH | MEDIUM | P1 |
| Automatic Phase Advancement | HIGH | HIGH | P1 |
| Standings Calculation | HIGH | MEDIUM | P1 |
| Dashboard de la journée | HIGH | HIGH | P1 |
| Check-in jour J | MEDIUM | LOW | P1 |
| Set/leg format configuration | MEDIUM | LOW | P1 |
| Walkover / Forfeit | MEDIUM | LOW | P1 |
| Bracket view (read-only) | MEDIUM | MEDIUM | P1 |
| SSE temps réel | MEDIUM | MEDIUM | P2 |
| Licencié DB integration | MEDIUM | HIGH | P2 |
| Audit log for corrections | MEDIUM | LOW | P2 |
| Scheduling optimization | LOW | HIGH | P3 |
| Player ratings/seeding | LOW | HIGH | P3 |
| Templates from DB | LOW | MEDIUM | P3 |

---

## Competitor Feature Analysis

Analyzed against Challonge, Toornament, and start.gg as reference points.

| Feature | Challonge | Toornament | Our Platform |
|---------|-----------|------------|--------------|
| Multiple tournaments per event | No (one bracket) | Yes (stages) | Yes (core design) |
| Federal hierarchy + scoped access | No | No | Yes (federation requirement) |
| Generate all matches at launch | No (lazy) | No (lazy) | Yes (enables scheduling) |
| Paper scorecard workflow | No | No | Yes (admin-only entry) |
| Phase chaining group → bracket | Basic | Yes | Yes |
| Referee assignment | No | No | Yes (federation rules) |
| Set/leg format configurable | Limited | Yes | Yes |
| Role-based admin delegation | Yes (basic) | Yes (detailed) | Yes (federation roles) |
| Check-in per tournament | Yes | Yes | Yes |
| BYE handling | Yes | Yes | Yes |
| Walkover/forfeit | Yes | Yes | Yes |
| Three-way tiebreaker | Manual | Yes | Yes (must implement) |

**Key finding:** No existing generic platform covers the combination of multi-tournament-per-event, federal hierarchy, pre-generated all matches, and referee assignment. This confirms the case for a custom platform.

---

## Sources

- [Round-robin tournament — Wikipedia](https://en.wikipedia.org/wiki/Round-robin_tournament) — BYE handling, Berger algorithm, odd-player rounds (MEDIUM confidence)
- [Double-elimination tournament — Wikipedia](https://en.wikipedia.org/wiki/Double-elimination_tournament) — loser bracket seeding rules (MEDIUM confidence)
- [Toornament Knowledge Base: Check-in](https://help.toornament.com/participant/check-in) — check-in patterns and no-show flow (MEDIUM confidence)
- [Challonge Knowledge Base: Participant Management](https://kb.challonge.com/en/article/participant-management-1m6ooqe/) — walkover and late registration patterns (MEDIUM confidence)
- [Limitless Docs: Tournament Settings](https://docs.limitlesstcg.com/organizer/reference) — phase advancement triggers, late registration cutoffs (MEDIUM confidence)
- [Battlefy: Tournament Flow](https://help.battlefy.com/en/articles/6945867-tournament-flow) — phase advancement automation patterns (MEDIUM confidence)
- [Toornament: Admin Permissions](https://help.toornament.com/organizer/manage-your-admins-permissions) — role-based access patterns (MEDIUM confidence)
- [Bracketsninja: Double Elimination](https://www.bracketsninja.com/types/double-elimination-bracket) — loser bracket structure (MEDIUM confidence)
- STACK.md (this project) — architecture decisions for match schema, BYE model, Berger algorithm (HIGH confidence)
- PROJECT.md (this project) — explicit feature requirements, domain constraints (HIGH confidence)
- Codebase analysis — existing types, phase model, wizard structure (HIGH confidence)

**LOW confidence / Needs validation:**
- Tiebreaker order for FFD traditional darts (head-to-head → legs diff → legs for): generic sports rule, not verified against FFD règlement
- BYE result treatment (win vs no-result): FFD-specific, not verified
- Three-way tie resolution protocol: standard algorithm known but federation-specific resolution may differ

---

*Feature research for: Tournament management — fléchette traditionnelle federation platform*
*Researched: 2026-02-28*
