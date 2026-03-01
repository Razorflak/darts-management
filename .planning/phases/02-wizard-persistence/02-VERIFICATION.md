---
phase: 02-wizard-persistence
verified: 2026-03-01T19:30:00Z
status: passed
score: 18/18 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 14/14
  gaps_closed:
    - "Les dates dans /events s'affichent en DD/MM/YYYY — jamais 'Invalid date'"
    - "Le message d'erreur de publication indique les droits requis, pas 'Accès refusé.'"
    - "Après application d'un template, les champs date de EventStep reflètent les valeurs appliquées"
    - "La card d'un événement brouillon est cliquable via un lien 'Reprendre l'édition'"
  gaps_remaining: []
  regressions: []
gaps: []
human_verification:
  - test: "Fill the wizard at /events/new as a logged-in organisateur, click Publier"
    expected: "Event appears in /events list with status 'Ouvert' after redirect"
    why_human: "End-to-end browser flow with real DB and authenticated session required"
  - test: "Save a draft at step 1, navigate to /events, click 'Reprendre l'édition' on the draft card"
    expected: "Wizard opens pre-populated with saved data; eventId pre-set; Save triggers UPDATE (no duplicate)"
    why_human: "Requires running DB, authenticated session, and DB inspection to confirm single row"
  - test: "Open the template modal and apply a template to the wizard"
    expected: "Event name, entity, dates, and tournaments pre-filled from template; start/end date fields in EventStep reflect the computed dates"
    why_human: "Visual and reactivity check requiring browser interaction with Datepicker components"
---

# Phase 2: Wizard Persistence — Verification Report

**Phase Goal:** The existing wizard prototype is wired to real server routes — an organisateur can create and publish an event that persists in PostgreSQL
**Verified:** 2026-03-01T19:30:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure (plans 02-05, 02-06, 02-07 closed 4 UAT failures)

## Gap Closure Context

The initial VERIFICATION.md (status: passed, 14/14) was written before UAT. UAT identified 4 issues:

| UAT Test | Issue | Plan | Commit |
|----------|-------|------|--------|
| Test 12: Invalid date display | postgres.js DATE objects formatted as 'Invalid date' in /events | 02-05 | c6a66ba |
| Test 11: Opaque error message | "Accès refusé." instead of descriptive permission error on publish | 02-05 | 88122ec |
| Test 7: Template date propagation | $state initializers in EventStep not reactive to applyTemplate() | 02-06 | caaa31b |
| Test 9: No way to resume draft | No /events/[id]/edit route, no Reprendre link on draft cards | 02-07 | 63d01ed, 115ba38 |

All 4 gaps are now closed and verified in the codebase.

## Goal Achievement

### Observable Truths (Original 14 + 4 Gap-Closure Truths)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Tables `event` and `tournament` exist in PostgreSQL with all required columns | VERIFIED | 006_event.sql: event_status enum, registration_opens_at, organizer_id, entity_id FK, 4 indexes; 007_tournament.sql: auto_referee BOOLEAN, phases JSONB, event_id FK CASCADE |
| 2 | EventData type has `registrationOpensAt?: string` field | VERIFIED | types.ts: `registrationOpensAt?: string` with correct ISO date comment |
| 3 | Tournament type has `autoReferee: boolean` field | VERIFIED | types.ts: `autoReferee: boolean // maps to auto_referee SQL column; EVENT-06` |
| 4 | POST /events/new/save creates a draft event+tournaments in DB and returns { ok: true, eventId } | VERIFIED | save/+server.ts: INSERT path with sql.begin() transaction, RETURNING id, returns json({ ok: true, eventId: savedEventId }) |
| 5 | POST /events/new/save with existing eventId updates the existing record (no duplicate row) | VERIFIED | save/+server.ts: UPDATE path inside transaction with ownership check (organizer_id must match) |
| 6 | POST /events/new/publish validates fully and transitions status to 'ready' | VERIFIED | publish/+server.ts: validateForPublish checks name, entity, startDate, endDate, tournament count, categories; status='ready' UPDATE inside sql.begin() transaction |
| 7 | Unauthenticated requests return 401 | VERIFIED | Both server.ts files: `if (!locals.user) return error(401, 'Non authentifié')` |
| 8 | Requests where user has no org role on selected entity return 403 with descriptive message | VERIFIED | publish/+server.ts line 50: `"Vous n'avez pas les droits organisateur sur l'entité sélectionnée."` (fixed by 02-05, commit 88122ec) |
| 9 | GET /events/new page load returns entities filtered to user's organisable roles | VERIFIED | +page.server.ts: getUserRoles, filter to organisableRoles array, SQL SELECT FROM entity WHERE id = ANY(entityIds) |
| 10 | Visiting /events shows a card per event scoped to the current user | VERIFIED | events/+page.server.ts: two-branch SQL query with organizer_id OR entity_id visibility; events/+page.svelte: Card grid with {#each data.events as event} |
| 11 | Draft events visible only to their creator | VERIFIED | events/+page.server.ts: `AND e.status != 'draft'` filter for entity-role visibility; organizer always sees own |
| 12 | The wizard is accessible at /events/new (entity selector uses real DB data) | VERIFIED | events/new/+page.svelte passes `entities={data.entities}` to EventStep; EventStep renders {#each entities as entity} with value={entity.id} |
| 13 | autoReferee checkbox wired in TournamentForm; eventId tracked for CREATE vs UPDATE | VERIFIED | TournamentForm.svelte: Toggle bind:checked={tournament.autoReferee}; +page.svelte: eventId state null initially, set from json.eventId after first save |
| 14 | Publish button calls publish endpoint, redirects to /events; publishError shown inline | VERIFIED | +page.svelte: fetch('/events/new/publish') + await goto('/events') on res.ok; PublishStep.svelte: {#if publishError} red error div |
| 15 | Dates in /events list display as DD/MM/YYYY when present, empty when absent — never 'Invalid date' | VERIFIED | +page.server.ts: `::text` cast on starts_at, ends_at, registration_opens_at in both SQL branches (commit c6a66ba). formatDate() accepts `string \| null \| undefined`, guards isNaN, returns '' for null/missing |
| 16 | After applying a template, EventStep date fields reflect the template-applied dates | VERIFIED | EventStep.svelte: 6 $effect blocks (3 inbound with propIso !== localIso guard + 3 outbound). Inbound sync fires when event.startDate/endDate/registrationOpensAt change externally (commit caaa31b) |
| 17 | Draft event cards in /events show a 'Reprendre l'edition' link pointing to /events/[id]/edit | VERIFIED | events/+page.svelte: `{#if event.status === 'draft'}` block with `href="/events/{event.id}/edit"` and "Reprendre l'édition →" text (commit 115ba38) |
| 18 | /events/[id]/edit loads event+tournaments from DB, pre-populates wizard, eventId pre-set so saves trigger UPDATE | VERIFIED | [id]/edit/+page.server.ts: ownership check (organizer_id + status='draft'), returns {event, tournaments, entities, eventId}. [id]/edit/+page.svelte: `let eventId = $state<string \| null>(data.eventId)`, `let event = $state<EventData>(data.event)`, `let tournaments = $state<Tournament[]>(data.tournaments)` (commits 63d01ed, 115ba38) |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/006_event.sql` | event table with status enum, registration_opens_at, organizer_id | VERIFIED | 23 lines, CREATE TYPE event_status, 11-column table, 4 indexes |
| `packages/db/src/schema/007_tournament.sql` | tournament table with phases JSONB, auto_referee, club | VERIFIED | 19 lines, REFERENCES event(id) ON DELETE CASCADE, auto_referee BOOLEAN, phases JSONB DEFAULT '[]' |
| `packages/front/src/lib/tournament/types.ts` | Extended EventData and Tournament types | VERIFIED | exports EventData (with registrationOpensAt), Tournament (with autoReferee) |
| `packages/front/src/lib/tournament/utils.ts` | createTournament() factory with autoReferee: false | VERIFIED | autoReferee: false in factory return |
| `packages/front/src/routes/(app)/events/new/+page.server.ts` | load function returning entities for entity selector | VERIFIED | exports load, returns { entities }, auth guard present |
| `packages/front/src/routes/(app)/events/new/save/+server.ts` | POST handler for draft save (INSERT or UPDATE) | VERIFIED | exports POST, both INSERT and UPDATE paths with sql.begin() transaction |
| `packages/front/src/routes/(app)/events/new/publish/+server.ts` | POST handler for publish (validate + status=ready) with descriptive 403 | VERIFIED | exports POST, validateForPublish, status='ready' inside transaction, descriptive "droits organisateur" message at line 50 |
| `packages/front/src/routes/(app)/events/+page.server.ts` | load returning scoped events list with ::text date casts | VERIFIED | exports load, two-branch query with draft filter, organizer_id scoping, ::text on starts_at/ends_at/registration_opens_at in both branches |
| `packages/front/src/routes/(app)/events/+page.svelte` | Events list with Card layout, formatDate hardened, Reprendre link on drafts | VERIFIED | Card grid, formatDate(string\|null\|undefined) with isNaN guard, {#if event.status==='draft'} Reprendre block |
| `packages/front/src/routes/(app)/events/new/+page.svelte` | Wizard page with save/publish fetch wiring | VERIFIED | fetch('/events/new/save') and fetch('/events/new/publish'), eventId state tracking, entities passed to EventStep |
| `packages/front/src/lib/tournament/components/EventStep.svelte` | Entity selector + registrationOpensAt field + reactive date sync | VERIFIED | entities prop, {#each entities as entity}, registrationDateObj; 6 $effect blocks (3 inbound with guard + 3 outbound) |
| `packages/front/src/lib/tournament/components/TournamentForm.svelte` | autoReferee checkbox | VERIFIED | Toggle bind:checked={tournament.autoReferee} |
| `packages/front/src/lib/tournament/components/PublishStep.svelte` | Inline error display + publish via fetch | VERIFIED | publishError?: string prop, {#if publishError} div with red styling |
| `packages/front/src/lib/tournament/components/TemplateModal.svelte` | Template pre-fill with autoReferee: false | VERIFIED | autoReferee: false in Tournament object construction, uses EVENT_TEMPLATES |
| `packages/front/src/routes/(app)/+layout.svelte` | Evenements nav link | VERIFIED | NavLi href="/events">Événements (grep confirmed) |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts` | Load function for edit route — ownership check, DB fetch, redirect on not-found | VERIFIED | 99 lines; auth guard, WHERE organizer_id AND status='draft', redirect(302,'/events') on missing, returns {event,tournaments,entities,eventId} (commit 63d01ed) |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.svelte` | Edit wizard pre-populated with DB data, eventId initialized | VERIFIED | 152 lines; eventId=$state(data.eventId), event=$state(data.event), tournaments=$state(data.tournaments), fetch('/events/new/save') with pre-set eventId (commit 115ba38) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 007_tournament.sql | 006_event.sql | `REFERENCES event(id) ON DELETE CASCADE` | WIRED | Line 5 of 007_tournament.sql confirmed |
| types.ts | 006_event.sql / 007_tournament.sql | autoReferee -> auto_referee, registrationOpensAt -> registration_opens_at | WIRED | types.ts exports both fields with matching SQL column comments |
| events/new/save/+server.ts | event table (DB) | sql.begin() INSERT/UPDATE + tournament inserts | WIRED | sql.begin with INSERT INTO event and INSERT INTO tournament |
| events/new/save/+server.ts | $lib/server/authz | getUserRoles() role check | WIRED | `const roles = await getUserRoles(locals.user.id)` |
| events/new/publish/+server.ts | event table (DB) | UPDATE event SET status = 'ready' | WIRED | `UPDATE event SET status = 'ready', updated_at = now()` inside transaction |
| events/+page.svelte | events/+page.server.ts | let { data } = $props() — data.events | WIRED | `let { data } = $props()`; `{#each data.events as event}` |
| events/+page.server.ts | event table (DB) | SQL query with organizer_id filter and ::text date casts | WIRED | `e.organizer_id = ${locals.user.id}` + `::text` on 3 date columns in both branches |
| events/new/+page.svelte | /events/new/save | fetch POST with JSON body including eventId | WIRED | `fetch('/events/new/save', { method: 'POST', body: JSON.stringify({ eventId, event, tournaments }) })` |
| events/new/+page.svelte | /events/new/publish | fetch POST from publish() handler | WIRED | `fetch('/events/new/publish', { method: 'POST', ... })` |
| EventStep.svelte | data.entities from +page.server.ts | entities prop passed from +page.svelte | WIRED | +page.svelte: `entities={data.entities}`; EventStep Props: `entities: { id, name, type }[]` |
| EventStep.svelte inbound $effects | event.startDate/endDate/registrationOpensAt prop | propIso !== localIso guard | WIRED | 3 inbound $effect blocks at lines 27-48 of EventStep.svelte (commit caaa31b) |
| events/+page.svelte Reprendre link | /events/[id]/edit | `href="/events/{event.id}/edit"` inside `{#if event.status === 'draft'}` | WIRED | Line 62 of events/+page.svelte confirms href pattern |
| events/[id]/edit/+page.server.ts | event + tournament tables (DB) | SQL SELECT with organizer_id ownership check and ::text date casts | WIRED | `WHERE id = ${eventId} AND organizer_id = ${locals.user.id} AND status = 'draft'` (line 29-31) |
| events/[id]/edit/+page.svelte | /events/new/save | fetch POST with pre-initialized eventId for UPDATE path | WIRED | `fetch('/events/new/save', { body: JSON.stringify({ eventId, event, tournaments }) })` — eventId is data.eventId (non-null), so server always takes UPDATE path |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EVENT-01 | 02-01, 02-02, 02-03, 02-04, 02-05, 02-07 | Organisateur peut créer un événement (nom, dates, lieu, entité organisatrice) et le persister | SATISFIED | SQL schema (006), save endpoint with INSERT/UPDATE, wizard form with all fields, entity selector from DB, date display fixed (::text), draft editing via /events/[id]/edit |
| EVENT-02 | 02-01, 02-02, 02-04 | Plusieurs tournois dans un même événement | SATISFIED | tournament table with event_id FK; save endpoint inserts multiple tournaments per event; TournamentStep allows adding multiple tournaments |
| EVENT-03 | 02-01, 02-02, 02-04 | Phases de tournoi (4 types: round-robin, poule double KO, élimination directe, double élimination) | SATISFIED | Phase types in types.ts (PhaseType union), PhasesBuilder component, phases stored as JSONB in tournament table |
| EVENT-04 | 02-04, 02-06 | Template de création rapide | SATISFIED | TemplateModal.svelte with EVENT_TEMPLATES, apply() pre-fills event and tournaments, wired to wizard via applyTemplate() callback; template dates now propagate to EventStep Datepicker fields (reactive $effect fix, commit caaa31b) |
| EVENT-05 | 02-02, 02-03, 02-04, 02-05 | Prévisualiser et publier (statut "ouvert aux inscriptions") | SATISFIED | PublishStep shows recap, publish endpoint transitions to 'ready', /events list shows status badges, descriptive 403 message on permission error |
| EVENT-06 | 02-01, 02-02, 02-04 | Activer/désactiver assignation automatique des arbitres | SATISFIED | autoReferee: boolean in Tournament type, auto_referee BOOLEAN in DB schema, Toggle in TournamentForm, persisted in INSERT/UPDATE |

All 6 requirements are marked Complete in REQUIREMENTS.md. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| EventStep.svelte | 55, 65, 85, 104, 118, 132 | `placeholder=` | Info | HTML input placeholder attributes — not code stubs |
| TournamentForm.svelte | 39 | `placeholder=` | Info | HTML input placeholder attribute — not a code stub |
| publish/+server.ts | 28 | `return null` | Info | Validation sentinel inside validateForPublish() — returns null when validation passes (correct use) |
| events/[id]/edit/+page.svelte | 14, 19, 20 | Svelte 5 warning: `state_referenced_locally` | Warning | `data.eventId`, `data.event`, `data.tournaments` used as `$state` initializers — Svelte warns these capture initial value only. This is intentional: the edit page initializes local state from server data once at load, then user edits own the state. The same pattern is used in /events/new. Not a blocker. |

No blockers found. The Svelte 5 warning on the edit page is a known pattern warning for `$state(data.x)` initialization — correct for an edit wizard where server data seeds initial state.

### Human Verification Required

#### 1. End-to-end event creation and publish flow

**Test:** Log in as a user with 'organisateur' role on at least one entity. Navigate to /events/new. Fill all required fields (name, entity, start date, end date). Add one tournament with a category. Click "Publier".
**Expected:** Redirect to /events. The new event appears as a card with status badge "Ouvert" (green). The entity name shown on the card matches the entity selected. Dates display as DD/MM/YYYY.
**Why human:** Requires a running dev server, a real PostgreSQL database with migrations applied, and an authenticated session with proper entity roles.

#### 2. Resume a saved draft via Reprendre link

**Test:** Fill the wizard with a name, click "Enregistrer". Return to /events. A draft card should appear with a "Reprendre l'édition →" link. Click it.
**Expected:** The edit wizard at /events/[id]/edit opens pre-populated with the saved name and data. A second "Enregistrer" returns the same eventId (UPDATE, not INSERT). DB shows one row.
**Why human:** Requires DB inspection (`SELECT COUNT(*) FROM event`) after two sequential saves, plus browser session tracking.

#### 3. Template pre-fill with date propagation

**Test:** On step 1 of /events/new, click "Créer depuis un template". Select a template, pick a start date in the modal, click "Appliquer le template".
**Expected:** The wizard pre-fills with the template's event name, dates, entity, and all configured tournaments. The start date field and computed end date field in EventStep reflect the template-applied values (not blank).
**Why human:** Visual and reactivity check — the $effect inbound sync needs browser render cycle to confirm Datepicker components update. Cannot verify reactive behavior statically.

### Gaps Summary

No gaps remain. All 4 UAT failures are closed:

1. **'Invalid date' in /events** — Fixed by ::text casts in +page.server.ts (both SQL branches) and hardened formatDate() function. Verified: `::text` present 6 times in +page.server.ts, `isNaN` guard present in formatDate().

2. **Opaque 'Accès refusé.' publish error** — Fixed in publish/+server.ts line 50: now returns "Vous n'avez pas les droits organisateur sur l'entité sélectionnée.". Verified: grep confirms string present.

3. **Template dates not propagating to EventStep** — Fixed by replacing 3 one-directional outbound `$effect` blocks with 6 blocks (3 inbound with `propIso !== localIso` guard + 3 outbound). Verified: 6 `$effect` blocks present, `propIso !== localIso` guard confirmed in EventStep.svelte.

4. **No way to resume a saved draft** — Fixed by creating /events/[id]/edit route (server load with ownership guard + wizard page pre-populated from DB data) and adding Reprendre link on draft cards. Verified: both files exist at 99 and 152 lines respectively, Reprendre href confirmed in +page.svelte.

The only remaining items are end-to-end browser flows that require a running database and authenticated session — these are flagged for human verification above.

svelte-check reports: 0 errors, 3 warnings (all in events/[id]/edit/+page.svelte, state_referenced_locally — intentional and non-blocking).

---

_Verified: 2026-03-01T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: after closure of 4 UAT gaps via plans 02-05, 02-06, 02-07_
