---
phase: 02-wizard-persistence
verified: 2026-03-01T15:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Fill the wizard at /events/new as a logged-in organisateur, click Publier"
    expected: "Event appears in /events list with status 'Ouvert' after redirect"
    why_human: "End-to-end browser flow with real DB and authenticated session required"
  - test: "Save a draft at step 1, navigate to step 2, click Enregistrer again"
    expected: "No duplicate event row — the second save updates the existing draft"
    why_human: "Requires DB inspection after two sequential saves"
  - test: "Open the template modal and apply a template to the wizard"
    expected: "Event name, entity, dates, and tournaments pre-filled from template; autoReferee: false on all tournaments"
    why_human: "Visual and data flow check requiring browser interaction"
---

# Phase 2: Wizard Persistence — Verification Report

**Phase Goal:** The existing wizard prototype is wired to real server routes — an organisateur can create and publish an event that persists in PostgreSQL
**Verified:** 2026-03-01T15:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Tables `event` and `tournament` exist in PostgreSQL with all required columns | VERIFIED | 006_event.sql: event_status enum, registration_opens_at, organizer_id, entity_id FK, 4 indexes; 007_tournament.sql: auto_referee BOOLEAN, phases JSONB, club TEXT, event_id FK CASCADE |
| 2 | EventData type has `registrationOpensAt?: string` field | VERIFIED | types.ts line 34: `registrationOpensAt?: string` with correct ISO date comment |
| 3 | Tournament type has `autoReferee: boolean` field | VERIFIED | types.ts line 74: `autoReferee: boolean // maps to auto_referee SQL column; EVENT-06` |
| 4 | POST /events/new/save creates a draft event+tournaments in DB and returns { ok: true, eventId } | VERIFIED | save/+server.ts: INSERT path with sql.begin() transaction, RETURNING id, returns json({ ok: true, eventId: savedEventId }) |
| 5 | POST /events/new/save with existing eventId updates the existing record (no duplicate row) | VERIFIED | save/+server.ts lines 41-77: UPDATE path inside transaction with ownership check (organizer_id must match) |
| 6 | POST /events/new/publish validates fully and transitions status to 'ready' | VERIFIED | publish/+server.ts: validateForPublish checks name, entity, startDate, endDate, tournament count, categories; status='ready' UPDATE inside sql.begin() transaction |
| 7 | Unauthenticated requests return 401 | VERIFIED | Both server.ts files: `if (!locals.user) return error(401, 'Non authentifié')` |
| 8 | Requests where user has no org role on selected entity return 403 | VERIFIED | Both server.ts files: getUserRoles + .some() filter against organisableRoles; returns json({ error }, { status: 403 }) |
| 9 | GET /events/new page load returns entities filtered to user's organisable roles | VERIFIED | +page.server.ts: getUserRoles, filter to organisableRoles array, SQL SELECT FROM entity WHERE id = ANY(entityIds) |
| 10 | Visiting /events shows a card per event scoped to the current user | VERIFIED | events/+page.server.ts: two-branch SQL query with organizer_id OR entity_id visibility; events/+page.svelte: Card grid with {#each data.events as event} |
| 11 | Draft events visible only to their creator | VERIFIED | events/+page.server.ts line 38: `AND e.status != 'draft'` filter for entity-role visibility; organizer always sees own |
| 12 | The wizard is accessible at /events/new (entity selector uses real DB data) | VERIFIED | events/new/+page.svelte passes `entities={data.entities}` to EventStep; EventStep renders {#each entities as entity} with value={entity.id} |
| 13 | autoReferee checkbox wired in TournamentForm; eventId tracked for CREATE vs UPDATE | VERIFIED | TournamentForm.svelte: Toggle bind:checked={tournament.autoReferee}; +page.svelte: eventId state null initially, set from json.eventId after first save |
| 14 | Publish button calls publish endpoint, redirects to /events; publishError shown inline | VERIFIED | +page.svelte: fetch('/events/new/publish') + await goto('/events') on res.ok; PublishStep.svelte lines 124-128: {#if publishError} red error div |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/006_event.sql` | event table with status enum, registration_opens_at, organizer_id | VERIFIED | 23 lines, CREATE TYPE event_status, 11-column table, 4 indexes |
| `packages/db/src/schema/007_tournament.sql` | tournament table with phases JSONB, auto_referee, club | VERIFIED | 19 lines, REFERENCES event(id) ON DELETE CASCADE, auto_referee BOOLEAN, phases JSONB DEFAULT '[]' |
| `packages/front/src/lib/tournament/types.ts` | Extended EventData and Tournament types | VERIFIED | exports EventData (with registrationOpensAt), Tournament (with autoReferee), svelte-check: 0 errors |
| `packages/front/src/lib/tournament/utils.ts` | createTournament() factory with autoReferee: false | VERIFIED | line 16: `autoReferee: false` in factory return |
| `packages/front/src/routes/(app)/events/new/+page.server.ts` | load function returning entities for entity selector | VERIFIED | exports `load`, returns { entities }, auth guard present |
| `packages/front/src/routes/(app)/events/new/save/+server.ts` | POST handler for draft save (INSERT or UPDATE) | VERIFIED | exports `POST`, both INSERT and UPDATE paths with sql.begin() transaction |
| `packages/front/src/routes/(app)/events/new/publish/+server.ts` | POST handler for publish (validate + status=ready) | VERIFIED | exports `POST`, validateForPublish function, status='ready' inside transaction |
| `packages/front/src/routes/(app)/events/+page.server.ts` | load function returning scoped events list | VERIFIED | exports `load`, two-branch query with draft filter, organizer_id scoping |
| `packages/front/src/routes/(app)/events/+page.svelte` | Events list page with Card layout | VERIFIED | Card grid, Badge status colors, French date formatting, data.events binding |
| `packages/front/src/routes/(app)/events/new/+page.svelte` | Wizard page with save/publish fetch wiring | VERIFIED | fetch('/events/new/save') and fetch('/events/new/publish'), eventId state tracking, entities passed to EventStep |
| `packages/front/src/lib/tournament/components/EventStep.svelte` | Entity selector from real data + registrationOpensAt field | VERIFIED | entities prop, {#each entities as entity} with value={entity.id}, registrationDateObj $state + $effect |
| `packages/front/src/lib/tournament/components/TournamentForm.svelte` | autoReferee checkbox | VERIFIED | Toggle bind:checked={tournament.autoReferee} at line 87 |
| `packages/front/src/lib/tournament/components/PublishStep.svelte` | Inline error display + publish via fetch | VERIFIED | publishError?: string prop, {#if publishError} div with red styling |
| `packages/front/src/lib/tournament/components/TemplateModal.svelte` | Template pre-fill with autoReferee: false | VERIFIED | autoReferee: false in Tournament object construction (line 77), uses EVENT_TEMPLATES |
| `packages/front/src/routes/(app)/+layout.svelte` | Evenements nav link | VERIFIED | NavLi href="/events">Événements (grep confirmed) |
| `packages/front/src/routes/tournaments/new/+page.svelte` | Deleted (route removed) | VERIFIED | File does not exist; entire tournaments/ directory deleted |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 007_tournament.sql | 006_event.sql | `REFERENCES event(id) ON DELETE CASCADE` | WIRED | Line 5 of 007_tournament.sql confirmed |
| types.ts | 006_event.sql / 007_tournament.sql | autoReferee -> auto_referee, registrationOpensAt -> registration_opens_at | WIRED | types.ts exports both fields with matching SQL column comments |
| events/new/save/+server.ts | event table (DB) | sql.begin() INSERT/UPDATE + tournament inserts | WIRED | Lines 44-107: sql.begin with INSERT INTO event and INSERT INTO tournament |
| events/new/save/+server.ts | $lib/server/authz | getUserRoles() role check | WIRED | Line 29: `const roles = await getUserRoles(locals.user.id)` |
| events/new/publish/+server.ts | event table (DB) | UPDATE event SET status = 'ready' | WIRED | Lines 91 and 123: `UPDATE event SET status = 'ready', updated_at = now()` inside transaction |
| events/+page.svelte | events/+page.server.ts | let { data } = $props() — data.events | WIRED | Line 24 of +page.svelte: `let { data } = $props()`; line 44: `{#each data.events as event}` |
| events/+page.server.ts | event table (DB) | SQL query with organizer_id filter | WIRED | Lines 37-38: `e.organizer_id = ${locals.user.id}` |
| events/new/+page.svelte | /events/new/save | fetch POST with JSON body including eventId | WIRED | Lines 51-65: `fetch('/events/new/save', { method: 'POST', body: JSON.stringify({ eventId, event, tournaments }) })` |
| events/new/+page.svelte | /events/new/publish | fetch POST from publish() handler | WIRED | Lines 73-87: `fetch('/events/new/publish', { method: 'POST', ... })` |
| EventStep.svelte | data.entities from +page.server.ts | entities prop passed from +page.svelte | WIRED | +page.svelte line 145: `entities={data.entities}`; EventStep Props: `entities: { id, name, type }[]` |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EVENT-01 | 02-01, 02-02, 02-03, 02-04 | Organisateur peut créer un événement (nom, dates, lieu, entité organisatrice) et le persister | SATISFIED | SQL schema (006), save endpoint with INSERT/UPDATE, wizard form with all fields, entity selector from DB |
| EVENT-02 | 02-01, 02-02, 02-04 | Plusieurs tournois dans un même événement | SATISFIED | tournament table with event_id FK; save endpoint inserts multiple tournaments per event; TournamentStep allows adding multiple tournaments |
| EVENT-03 | 02-01, 02-02, 02-04 | Phases de tournoi (4 types: round-robin, poule double KO, élimination directe, double élimination) | SATISFIED | Phase types in types.ts (PhaseType union), PhasesBuilder component, phases stored as JSONB in tournament table; confirmed all 4 types present |
| EVENT-04 | 02-04 | Template de création rapide | SATISFIED | TemplateModal.svelte with EVENT_TEMPLATES, apply() pre-fills event and tournaments, wired to wizard via applyTemplate() callback |
| EVENT-05 | 02-02, 02-03, 02-04 | Prévisualiser et publier (statut "ouvert aux inscriptions") | SATISFIED | PublishStep shows recap, publish endpoint transitions to 'ready', /events list shows status badges |
| EVENT-06 | 02-01, 02-02, 02-04 | Activer/désactiver assignation automatique des arbitres | SATISFIED | autoReferee: boolean in Tournament type, auto_referee BOOLEAN in DB schema, Toggle in TournamentForm, persisted in INSERT/UPDATE |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| EventStep.svelte | 55, 65, 85, 104, 118, 132 | `placeholder=` | Info | HTML input placeholder attributes — not code stubs |
| TournamentForm.svelte | 39 | `placeholder=` | Info | HTML input placeholder attribute — not a code stub |
| publish/+server.ts | 28 | `return null` | Info | Validation sentinel inside validateForPublish() — correct use, returns null when validation passes |

No blockers or warnings found. All matches are legitimate HTML/validation patterns.

### Human Verification Required

#### 1. End-to-end event creation and publish flow

**Test:** Log in as a user with 'organisateur' role on at least one entity. Navigate to /events/new. Fill all required fields (name, entity, start date, end date). Add one tournament with a category. Click "Publier".
**Expected:** Redirect to /events. The new event appears as a card with status badge "Ouvert" (green). The entity name shown on the card matches the entity selected.
**Why human:** Requires a running dev server, a real PostgreSQL database with migrations applied, and an authenticated session with proper entity roles.

#### 2. Draft save idempotency (CREATE vs UPDATE)

**Test:** At step 1 of the wizard, enter an event name and click "Enregistrer". Note the eventId in browser devtools (Network tab response). Fill more fields, click "Enregistrer" again.
**Expected:** The second response returns the same eventId. Only one row exists in the event table (no duplicate).
**Why human:** Requires DB inspection (psql `SELECT COUNT(*) FROM event`) and two sequential saves in the same browser session.

#### 3. Template pre-fill and application

**Test:** On step 1, click "Créer depuis un template". Select a template, pick a start date, click "Appliquer le template".
**Expected:** The wizard pre-fills with the template's event name, dates, entity, and all configured tournaments (each with correct phases and autoReferee: false).
**Why human:** Visual and data flow verification requires browser interaction with the modal component.

### Gaps Summary

No gaps found. All 14 observable truths are verified. All artifacts exist, are substantive (no stubs), and are wired correctly. All 6 requirements (EVENT-01 through EVENT-06) have evidence of implementation. All 11 commits documented in SUMMARYs exist in git history. The front package passes `svelte-check` with 0 errors and 0 warnings (2319 files checked).

The only items flagged for human verification are end-to-end browser flows that require a running database and authenticated session — these cannot be verified statically.

---

_Verified: 2026-03-01T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
