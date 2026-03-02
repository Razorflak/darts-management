---
phase: 02-wizard-persistence
verified: 2026-03-02T00:30:00Z
status: passed
score: 20/20 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 18/18
  context: >
    Previous verification (2026-03-01) covered the original wave plans.
    The phase was fully replanned (plans 02-01 to 02-05, wave 2+3), introducing
    a normalized phase table (008), rewritten save/publish endpoints, an expanded
    edit route (draft/ready/started), EventStep readonly mode, clickable Breadcrumb,
    and a cleaned-up PublishStep (no checkboxes). All 20 must-haves from the new
    plans verified against the actual codebase.
  gaps_closed:
    - "Migration 008: normalized phase table replacing JSONB column"
    - "save/publish endpoints write to phase table (not JSONB)"
    - "Edit route accepts ready and started events (not only draft)"
    - "Phases loaded from phase table in edit load"
    - "EventStep readonly prop + disabled fields when status=started"
    - "Breadcrumb onStepClick prop — steps are clickable"
    - "PublishStep: no Checkbox, no PublishOptions, eventStatus prop added"
    - "Events list: edit links for all non-finished statuses"
  gaps_remaining: []
  regressions: []
gaps: []
human_verification:
  - test: "Create a new event through the wizard at /events/new — fill all fields, add a tournament with phases, click Publier"
    expected: "Redirect to /events; event card appears with status 'Ouvert'; dates display DD/MM/YYYY; phases stored in phase table (SELECT * FROM phase WHERE tournament_id=...)"
    why_human: "End-to-end browser flow requiring running DB with migrations 001-008 applied and authenticated session"
  - test: "Open /events/[id]/edit for a draft event, Enregistrer, then Enregistrer again"
    expected: "DB shows one event row (no duplicate), two saves produce the same eventId; phase rows replaced (DELETE + re-INSERT idempotent)"
    why_human: "Requires DB inspection after sequential saves to confirm single row and idempotent phase replacement"
  - test: "Transition a ready or started event to /events/[id]/edit — verify EventStep readonly when started, editable when ready"
    expected: "When started: yellow banner visible, all EventStep inputs disabled, Suivant button still active. When ready: form fully editable, Publier button absent (only Enregistrer shown)"
    why_human: "Visual and interaction check requiring real event rows in DB with status='started' and status='ready'"
  - test: "Open TemplateModal, pick a template, select a start date, click Appliquer — verify date propagation to EventStep"
    expected: "After applying, startDate and endDate Datepicker fields in EventStep reflect the template-computed ISO dates (not blank)"
    why_human: "Reactive $effect propagation requires browser render cycle; Datepicker component visual update cannot be verified statically"
---

# Phase 2: Wizard Persistence — Verification Report

**Phase Goal:** Persistance du wizard — sauvegarder l'état du wizard en base, publier depuis le wizard, éditer un événement existant
**Verified:** 2026-03-02T00:30:00Z
**Status:** PASSED
**Re-verification:** Yes — after full replan (wave 2+3, plans 02-01 to 02-05)

## Replan Context

The phase was fully replanned after the original implementation. Five new plans replaced the prior wave:

| Plan | What It Delivered |
|------|-------------------|
| 02-01 | Migration 008: normalized `phase` table + `PublishOptions` removed from types.ts |
| 02-02 | Working-tree cleanup: templates.ts, labels.ts, AddPhaseMenu, BracketTiers, seed, edit server |
| 02-03 | Rewrote save/publish endpoints to write phases to `phase` table (not JSONB) |
| 02-04 | Edit route accepts draft/ready/started; phases loaded from table; EventStep readonly; Breadcrumb clickable |
| 02-05 | PublishStep cleaned (no checkboxes, eventStatus prop); /events list edit links for all non-finished statuses |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Migration 008 creates `phase` table with all required columns | VERIFIED | 008_phase_table.sql: CREATE TABLE phase (id, tournament_id, position, type, entrants, players_per_group, qualifiers_per_group, qualifiers, tiers, created_at), index phase_tournament_idx, ALTER TABLE tournament DROP COLUMN phases |
| 2 | `PublishOptions` is removed from types.ts | VERIFIED | types.ts: grep returns 0 matches for PublishOptions anywhere in src/ |
| 3 | types.ts has `registrationOpensAt?: string` and `autoReferee: boolean` | VERIFIED | types.ts line 34: `registrationOpensAt?: string`; line 74: `autoReferee: boolean` |
| 4 | `labels.ts` covers all Category values including double/double_female/double_mix | VERIFIED | labels.ts lines 10-12: `double: 'Double'`, `double_female: 'Double Féminin'`, `double_mix: 'Double Mixte'` |
| 5 | `templates.ts` is tracked by git and exports EVENT_TEMPLATES | VERIFIED | File exists at 221 lines; exports EventTemplate, TournamentTemplate, PhaseTemplate, EVENT_TEMPLATES |
| 6 | save/+server.ts writes phases to `phase` table (INSERT INTO phase) | VERIFIED | save/+server.ts: insertPhases() function at line 22-42, called for every tournament in both INSERT and UPDATE paths; no JSON.stringify(t.phases) anywhere |
| 7 | save UPDATE path accepts draft, ready, and started (not only draft) | VERIFIED | save/+server.ts line 74: `status IN ('draft', 'ready', 'started')` |
| 8 | publish/+server.ts writes phases to `phase` table | VERIFIED | publish/+server.ts: same insertPhases() function, called in both paths |
| 9 | publish status transition is conditional: only draft→ready; ready/started unchanged | VERIFIED | publish/+server.ts lines 122-124: `if (existing.status === 'draft') { UPDATE event SET status = 'ready' }` |
| 10 | publish/+server.ts returns descriptive 403 message | VERIFIED | publish/+server.ts line 75-78: `"Vous n'avez pas les droits organisateur sur l'entité sélectionnée."` |
| 11 | edit/+page.server.ts loads event filtering status IN ('draft','ready','started') | VERIFIED | +page.server.ts line 31: `AND status IN ('draft', 'ready', 'started')` |
| 12 | edit/+page.server.ts loads phases from `phase` table (not JSONB) | VERIFIED | +page.server.ts lines 74-80: `SELECT ... FROM phase WHERE tournament_id = ANY(${tournamentIds})`, grouped and mapped to Phase[] |
| 13 | edit/+page.server.ts returns `eventStatus` | VERIFIED | +page.server.ts line 150-152: `const eventStatus = row.status as 'draft' \| 'ready' \| 'started'`; returned in load |
| 14 | EventStep accepts `readonly` prop; disables all fields when started | VERIFIED | EventStep.svelte line 11: `readonly?: boolean`; disabled={readonly} on all inputs, Select, Datepicker, TimeInput; yellow banner at line 67-71 |
| 15 | Breadcrumb accepts `onStepClick` prop; renders steps as clickable buttons when provided | VERIFIED | Breadcrumb.svelte line 6: `onStepClick?: (step: WizardStep) => void`; `{#if onStepClick}` block at line 28-68 renders buttons with onclick handler |
| 16 | edit/+page.svelte passes readonly={data.eventStatus==='started'} and eventStatus to children | VERIFIED | edit/+page.svelte line 126: `readonly={data.eventStatus === 'started'}`; line 138: `eventStatus={data.eventStatus}` |
| 17 | PublishStep has no Checkbox, no PublishOptions; has eventStatus prop | VERIFIED | PublishStep.svelte: grep for Checkbox/PublishOptions/openRegistrations/notifications returns 0; line 19: `eventStatus?: 'draft' \| 'ready' \| 'started'`; line 120: `{#if eventStatus === 'ready' \|\| eventStatus === 'started'}` |
| 18 | events/+page.svelte shows edit link for all non-finished statuses | VERIFIED | +page.svelte line 59: `{#if event.status !== 'finished'}`; line 65: `{event.status === 'draft' ? 'Reprendre l\'édition →' : 'Modifier →'}` |
| 19 | 003_seed_dev.sql TRUNCATE includes user_entity_role; tanguy test user present | VERIFIED | seed line 6: `TRUNCATE user_entity_role, account, session, verification, entity, "user" CASCADE;`; lines 38, 46, 62-63: tanguy user with adminFederal role |
| 20 | AddPhaseMenu and BracketTiers use native dropdowns (no Flowbite Dropdown import) | VERIFIED | AddPhaseMenu.svelte: native button + fixed backdrop (z-10) + absolute menu (z-20), no Flowbite Dropdown import; BracketTiers.svelte: same native pattern |

**Score:** 20/20 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/db/src/schema/008_phase_table.sql` | phase table migration | VERIFIED | 21 lines; CREATE TABLE phase, phase_tournament_idx, ALTER TABLE tournament DROP COLUMN phases |
| `packages/front/src/lib/tournament/types.ts` | Types sans PublishOptions | VERIFIED | 77 lines; EventData, Tournament, Phase types; no PublishOptions |
| `packages/front/src/lib/tournament/labels.ts` | CATEGORY_LABELS couvrant double/double_female/double_mix | VERIFIED | 36 lines; all 9 Category values present |
| `packages/front/src/lib/tournament/templates.ts` | EventTemplate, TournamentTemplate, EVENT_TEMPLATES | VERIFIED | 221 lines; exports 4 types, 2 templates (comite, coupe_nationale) |
| `packages/front/src/routes/(app)/events/new/save/+server.ts` | POST handler with phase table writes, status IN check | VERIFIED | 148 lines; insertPhases(), INSERT/UPDATE paths, status IN ('draft','ready','started') |
| `packages/front/src/routes/(app)/events/new/publish/+server.ts` | POST handler with phase writes, conditional status transition, descriptive 403 | VERIFIED | 169 lines; validateForPublish(), insertPhases(), conditional status='ready' only from draft, descriptive 403 |
| `packages/front/src/routes/(app)/events/+page.server.ts` | load with scoped events + ::text date casts | VERIFIED | 63 lines; two-branch query with organizer/entity scoping, ::text on 3 date columns both branches |
| `packages/front/src/routes/(app)/events/+page.svelte` | Events list with edit links for non-finished | VERIFIED | 73 lines; status !== 'finished' condition, differentiated link text |
| `packages/front/src/routes/(app)/events/new/+page.svelte` | Wizard with save/publish fetch, onStepClick breadcrumb | VERIFIED | 163 lines; fetch('/events/new/save') and fetch('/events/new/publish'), Breadcrumb onStepClick wired |
| `packages/front/src/routes/(app)/events/new/+page.server.ts` | load returning entities for selector | VERIFIED | 23 lines; getUserRoles, organisable filter, SQL SELECT FROM entity |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts` | load for edit — status IN, phase table query, eventStatus returned | VERIFIED | 153 lines; status IN, phase loading with grouping, eventStatus in return |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.svelte` | Edit wizard — eventStatus passed, readonly EventStep, eventId pre-set | VERIFIED | 148 lines; eventId=$state(data.eventId), event=$state(data.event), readonly={data.eventStatus==='started'}, eventStatus={data.eventStatus} |
| `packages/front/src/lib/tournament/components/EventStep.svelte` | Readonly prop, 6 $effect blocks for date sync | VERIFIED | 177 lines; readonly prop, 3 inbound + 3 outbound $effect blocks with propIso !== localIso guard, disabled on all fields |
| `packages/front/src/lib/tournament/components/Breadcrumb.svelte` | onStepClick prop, conditional clickable buttons | VERIFIED | 118 lines; onStepClick? prop, {#if onStepClick} branch renders buttons |
| `packages/front/src/lib/tournament/components/PublishStep.svelte` | No Checkbox/PublishOptions; eventStatus prop; conditional Publier button | VERIFIED | 128 lines; eventStatus prop, {#if eventStatus==='ready'\|\|'started'} shows message instead of Publier button |
| `packages/front/src/lib/tournament/components/TournamentForm.svelte` | Toggle bind:checked={tournament.autoReferee} | VERIFIED | 100 lines; Toggle id="auto-referee-{tournament.id}" bind:checked={tournament.autoReferee} |
| `packages/front/src/lib/tournament/components/TemplateModal.svelte` | EVENT_TEMPLATES import, apply() sets autoReferee: false | VERIFIED | 139 lines; import EVENT_TEMPLATES from templates.js; autoReferee: false in Tournament construction |
| `packages/front/src/lib/tournament/components/phases/AddPhaseMenu.svelte` | Native dropdown (no Flowbite Dropdown) | VERIFIED | 56 lines; fixed backdrop + absolute menu, no Flowbite Dropdown import |
| `packages/front/src/lib/tournament/components/phases/BracketTiers.svelte` | Native dropdown (no Flowbite Dropdown) | VERIFIED | 137 lines; fixed backdrop + absolute menu, no Flowbite Dropdown import |
| `packages/db/src/schema/003_seed_dev.sql` | TRUNCATE includes user_entity_role; tanguy user present | VERIFIED | 65 lines; user_entity_role first in TRUNCATE; tanguy user row and role row present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| 008_phase_table.sql | 007_tournament.sql | ALTER TABLE tournament DROP COLUMN phases | WIRED | Line 20 confirmed |
| save/+server.ts | phase table | INSERT INTO phase in insertPhases() | WIRED | insertPhases() called after every tournament INSERT; line 28 confirmed |
| publish/+server.ts | phase table | INSERT INTO phase in insertPhases() | WIRED | insertPhases() called in both INSERT and UPDATE paths; line 28 confirmed |
| edit/+page.server.ts | phase table | SELECT FROM phase WHERE tournament_id = ANY(...) | WIRED | Lines 74-80 confirmed; grouped by tournament_id |
| edit/+page.svelte | EventStep.svelte | readonly={data.eventStatus === 'started'} | WIRED | Line 126 confirmed |
| edit/+page.svelte | Breadcrumb.svelte | onStepClick={(s) => (step = s)} | WIRED | Line 110 confirmed |
| edit/+page.svelte | PublishStep.svelte | eventStatus={data.eventStatus} | WIRED | Line 138 confirmed |
| new/+page.svelte | Breadcrumb.svelte | onStepClick={(s) => (step = s)} | WIRED | Line 126 confirmed |
| events/+page.svelte | events/+page.server.ts | let { data } = $props(); data.events | WIRED | Line 25 confirmed; {#each data.events as event} line 41 |
| events/+page.server.ts | event table | organizer_id scoping + ::text on 3 date columns | WIRED | Lines 40-41, 30-32 confirmed in both SQL branches |
| TemplateModal.svelte | templates.ts | import { EVENT_TEMPLATES } from '../templates.js' | WIRED | Line 4 confirmed |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EVENT-01 | 02-01, 02-02, 02-03, 02-04, 02-05 | Organisateur peut créer un événement (nom, dates, lieu, entité) et le persister | SATISFIED | SQL schema (006 event + 007 tournament + 008 phase), save endpoint INSERT/UPDATE with transactions, entity selector from DB, edit route for draft/ready/started, date ::text casts |
| EVENT-02 | 02-01, 02-02, 02-03, 02-04, 02-05 | Plusieurs tournois dans un même événement | SATISFIED | tournament table with event_id FK; save/publish loop over body.tournaments; TournamentStep allows adding multiple; edit load returns Tournament[] |
| EVENT-03 | 02-01, 02-02, 02-03, 02-04 | Phases de tournoi (4 types) | SATISFIED | PhaseType union in types.ts; insertPhases() maps GroupPhase/EliminationPhase → phase table columns with correct column mapping; phases loaded from phase table in edit; AddPhaseMenu with all 4 types |
| EVENT-04 | 02-02 | Template de création rapide | SATISFIED | TemplateModal with EVENT_TEMPLATES (comite, coupe_nationale), apply() pre-fills event+tournaments; 6 $effect blocks in EventStep propagate template dates to Datepicker |
| EVENT-05 | 02-03, 02-04, 02-05 | Prévisualiser et publier (statut "ouvert aux inscriptions") | SATISFIED | validateForPublish with full validation, status='ready' transition (conditional on current status='draft'), PublishStep recap, descriptive 403 message, events list shows status badges |
| EVENT-06 | 02-01, 02-03, 02-04 | Activer/désactiver assignation automatique des arbitres | SATISFIED | autoReferee: boolean in Tournament type; auto_referee BOOLEAN in 007_tournament.sql; Toggle bind:checked in TournamentForm; persisted in INSERT/UPDATE in both save and publish endpoints |

All 6 requirements satisfied. No orphaned requirements. All 6 marked Complete in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| publish/+server.ts | 54 | `return null` | Info | Validation sentinel in validateForPublish() — returns null when validation passes (correct use, not a stub) |
| EventStep.svelte | 85, 115, 116, 150, 165, 168 | `placeholder=` | Info | HTML input placeholder attributes — not code stubs |
| TournamentForm.svelte | 39 | `placeholder=` | Info | HTML input placeholder attribute — not a code stub |
| TemplateModal.svelte | 123 | `style="toto"` | Warning | Unused/test style attribute on Datepicker — cosmetic, no functional impact. Not a blocker. |

No blockers found. The `style="toto"` in TemplateModal.svelte is a cosmetic leftover; it does not affect functionality.

### Human Verification Required

#### 1. End-to-end event creation and publish flow

**Test:** Log in as a user with 'organisateur' role on at least one entity. Navigate to /events/new. Fill all required fields (name, entity, start date, end date). Add one tournament with a category and at least one phase. Click "Publier".
**Expected:** Redirect to /events. The new event card appears with status badge "Ouvert" (green). Dates display as DD/MM/YYYY. Running `SELECT COUNT(*) FROM phase` confirms phase rows were inserted.
**Why human:** Requires running dev server, PostgreSQL with migrations 001-008 applied, and authenticated session with entity role.

#### 2. Idempotent save — no duplicate rows

**Test:** Fill the wizard with a name, click "Enregistrer" twice on /events/new. Then click "Enregistrer" once on the resulting /events/[id]/edit.
**Expected:** DB shows exactly one event row after all three saves. Phase rows are replaced, not appended.
**Why human:** Requires DB inspection (`SELECT COUNT(*) FROM event WHERE name=...` and `SELECT COUNT(*) FROM phase WHERE tournament_id=...`) across sequential saves.

#### 3. EventStep readonly when started

**Test:** Open /events/[id]/edit for an event with status='started' in DB.
**Expected:** Yellow banner "Événement démarré — les informations de l'événement sont en lecture seule." visible. All EventStep inputs (name, entity, dates, location) are disabled. "Suivant →" button still active. No "Publier" button on PublishStep — only the "Enregistrer" header button.
**Why human:** Requires a DB row with status='started'; visual inspection of disabled inputs in browser.

#### 4. Template date propagation to EventStep Datepicker

**Test:** On step 1 of /events/new, click "Créer depuis un template". Select "Tournoi de Comité", pick a start date in the modal (e.g. 15/06/2026), click "Appliquer le template".
**Expected:** EventStep shows start date "15/06/2026" and end date "15/06/2026" (1-day event) pre-filled in the Datepicker fields.
**Why human:** The 3 inbound $effect blocks in EventStep fire on reactive prop changes — requires browser render cycle to confirm Datepicker components visually reflect the applied dates.

### Gaps Summary

No gaps. All 20 must-haves verified. The phase goal is achieved:

- Phases persist in the normalized `phase` table (migration 008 + updated endpoints)
- Draft save and re-edit work end-to-end (INSERT/UPDATE logic with ownership check)
- Events with status ready and started are editable via /events/[id]/edit
- EventStep is read-only for started events; PublishStep hides the Publier button for ready/started
- Breadcrumb is clickable in both wizards
- Events list shows edit links for all non-finished statuses
- Templates pre-fill the wizard including date propagation
- All 6 requirements (EVENT-01 to EVENT-06) are satisfied and marked Complete

The only remaining items are end-to-end browser flows requiring a running database and authenticated session — flagged above for human verification.

The `style="toto"` in TemplateModal.svelte (line 123) is a cosmetic leftover that should be cleaned up but is not a blocker.

---

_Verified: 2026-03-02T00:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: after full replan of phase 02 (wave 2+3, plans 02-01 to 02-05)_
