# Roadmap: Darts Management — v1.0 Tournoi de bout en bout

## Overview

Six phases carry the project from zero backend to a fully operational tournament lifecycle. Phase 1 lays the auth and database foundation that every other phase depends on. Phases 2 and 3 build the pre-launch path: event creation persisted to PostgreSQL and player registration. Phase 4 is the algorithmic core — tournament launch with atomic match generation. Phase 5 closes the loop with result entry and automatic phase advancement. Phase 6 delivers the read-only views (standings, brackets, day dashboard) that make the tournament visible to participants and organizers.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth (Better Auth v1.4.x), full DB schema, and federal entity hierarchy
- [ ] **Phase 2: Wizard Persistence** - Event and tournament configuration saved to PostgreSQL
- [ ] **Phase 3: Player Registration** - Player self-registration, manual add, check-in jour J
- [ ] **Phase 4: Launch and Match Generation** - Atomic match generation for all phase types with referee assignment
- [ ] **Phase 5: Results and Advancement** - Result entry, automatic phase advancement, standings calculation
- [ ] **Phase 6: Views and Dashboard** - Standings display, bracket views, day-overview dashboard

## Phase Details

### Phase 1: Foundation
**Goal**: Auth, DB schema, and entity hierarchy are in place so every subsequent phase can build on a stable, secured base
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, ORG-01, ORG-02, ORG-03
**Success Criteria** (what must be TRUE):
  1. A new user can register with email/password and receive a confirmation
  2. A registered user can log in and stay logged in across browser sessions and page reloads
  3. A user can reset a forgotten password via an email link
  4. An admin federal can create entities (Federation, Ligue, Comite, Club) and establish the parent-child hierarchy
  5. An organisateur can create events scoped to their entity (entity selector populated from DB)
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — DB foundation: Better Auth setup, permissions, SQL migrations, dev seed
- [ ] 01-02-PLAN.md — SvelteKit wiring: hooks, app.d.ts, route groups, shell layout with navbar
- [ ] 01-03-PLAN.md — Auth pages: register, login, password reset 3-step flow
- [ ] 01-04-PLAN.md — Entity admin UI: flat list with grouping, creation form with parent selector

### Phase 2: Wizard Persistence
**Goal**: The existing wizard prototype is wired to real server routes — an organisateur can create and publish an event that persists in PostgreSQL
**Depends on**: Phase 1
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, EVENT-06
**Success Criteria** (what must be TRUE):
  1. An organisateur can fill the wizard (name, dates, location, entity) and submit — event appears in the events list after submit
  2. An organisateur can configure multiple tournaments (one per category) within the same event and save them
  3. An organisateur can configure phases of all 4 types (round-robin, poule double KO, elimination directe, double elimination) with group naming (Poule A, B...)
  4. An organisateur can load a template to pre-fill the wizard with a typical phase structure
  5. An organisateur can preview the event and publish it (status transitions to "open for registration")
**Plans**: TBD

### Phase 3: Player Registration
**Goal**: Players can register for a tournament and the admin can manage the roster and check-in before launch
**Depends on**: Phase 2
**Requirements**: PLAYER-01, PLAYER-02, PLAYER-03, PLAYER-04
**Success Criteria** (what must be TRUE):
  1. A logged-in player can self-register for a tournament that is open for registration
  2. An admin tournoi can manually add a player to a tournament by name
  3. An admin tournoi can mark players as present (check-in) on the day of the event, and absent players are visible before launch
  4. Check-in mode is configurable per tournament — when disabled, all registered players are treated as present
**Plans**: TBD

### Phase 4: Launch and Match Generation
**Goal**: An admin tournoi can launch a tournament, locking configuration and generating every match for every phase atomically in one database transaction
**Depends on**: Phase 3
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05
**Success Criteria** (what must be TRUE):
  1. An admin tournoi can trigger launch — after launch the tournament is locked (configuration changes are rejected)
  2. After a successful launch, every match for every phase (round-robin groups, poule double KO, elimination brackets) exists in the database with correct opponents and bracket slot wiring (advances_to_match_id)
  3. If anything fails during generation, the entire launch is rolled back and the tournament remains in pre-launch state (no partial match records)
  4. Each phase's match format (sets to win, legs per set) reflects the value configured before launch
  5. When referee assignment is enabled for a tournament, every generated match has an assigned referee who is a registered player in the tournament and is not playing in that match
**Plans**: TBD

### Phase 5: Results and Advancement
**Goal**: An admin tournoi can enter match results and the system automatically advances players through the bracket and computes standings
**Depends on**: Phase 4
**Requirements**: RESULT-01, RESULT-02, RESULT-03, RESULT-04
**Success Criteria** (what must be TRUE):
  1. An admin tournoi can enter a score (sets/manches) for any match — the result is validated against the phase format before saving
  2. An admin tournoi can record a forfeit or walkover for a match, and the present player advances as if they had won
  3. After a result is saved, the winning player automatically appears in the next bracket slot (advances_to_match_id target) without manual intervention
  4. When all matches of a group phase are complete, qualifiers are seeded into the next phase's bracket automatically
**Plans**: TBD

### Phase 6: Views and Dashboard
**Goal**: Standings, bracket progressions, and the day-overview dashboard are visible to any visitor without login, refreshed on demand
**Depends on**: Phase 5
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. Any visitor can navigate to a tournament's standings page and see current results (manual refresh to update)
  2. The round-robin standings page shows points, wins, losses, and leg difference for each player in each group
  3. The elimination bracket page displays the full bracket tree with player names in each slot, including winners advancing through single and double elimination structures
  4. The admin tournoi can open the day dashboard and see all matches across all tournaments with their current status (pending, in progress, complete)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | In Progress|  |
| 2. Wizard Persistence | 0/? | Not started | - |
| 3. Player Registration | 0/? | Not started | - |
| 4. Launch and Match Generation | 0/? | Not started | - |
| 5. Results and Advancement | 0/? | Not started | - |
| 6. Views and Dashboard | 0/? | Not started | - |
