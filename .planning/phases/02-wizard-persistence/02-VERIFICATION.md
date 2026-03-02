---
phase: 02-wizard-persistence
verified: 2026-03-02T14:00:00Z
status: passed
score: 20/20 must-haves verified (wave 2+3) + 11/11 gap-closure must-haves verified (plans 02-06/07/08)
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
  - test: "Open TemplateModal, pick a template, select a start date of 01/01/2026, click Appliquer — verify date propagation to EventStep"
    expected: "After applying, startDate in EventStep shows 01/01/2026 — not 31/12/2025 (no 1-day UTC offset)"
    why_human: "Timezone-dependent behaviour requires browser render cycle in UTC+1 locale to confirm no offset"
  - test: "Click the 'Ouverture des inscriptions' datepicker in EventStep, select a date, click away"
    expected: "The selected date is retained in the field — field does not return to blank"
    why_human: "Flowbite-Svelte Datepicker onselect handler reactivity requires browser interaction to confirm"
  - test: "Add a tournament in the wizard — verify date field appears before the time field"
    expected: "A Datepicker for tournament start date is visible (optional, labeled 'Date optionnelle'); TimeInput is to its right in a flex layout"
    why_human: "Layout and component rendering require browser view"
---

# Phase 2: Wizard Persistence — Verification Report

**Phase Goal:** Persistance du wizard — sauvegarder l'état du wizard en base, publier depuis le wizard, éditer un événement existant
**Verified:** 2026-03-02T14:00:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure plans 02-06, 02-07, 02-08

## Replan Context

The phase was fully replanned after the original implementation. Five new plans replaced the prior wave:

| Plan | What It Delivered |
|------|-------------------|
| 02-01 | Migration 008: normalized `phase` table + `PublishOptions` removed from types.ts |
| 02-02 | Working-tree cleanup: templates.ts, labels.ts, AddPhaseMenu, BracketTiers, seed, edit server |
| 02-03 | Rewrote save/publish endpoints to write phases to `phase` table (not JSONB) |
| 02-04 | Edit route accepts draft/ready/started; phases loaded from table; EventStep readonly; Breadcrumb clickable |
| 02-05 | PublishStep cleaned (no checkboxes, eventStatus prop); /events list edit links for all non-finished statuses |

## Goal Achievement (Wave 2+3 — Plans 02-01 to 02-05)

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

### Required Artifacts (Wave 2+3)

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

### Key Link Verification (Wave 2+3)

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

---

## Gap Closure Verification (Plans 02-06, 02-07, 02-08)

**Re-verified:** 2026-03-02T14:00:00Z
**4 UAT gaps addressed:** timezone bug, registrationOpensAt datepicker, tournament startDate UI, Zod schemas

### Gap-Closure Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `toLocalDateISO(d: Date): string` exported from utils.ts using getFullYear/getMonth/getDate | VERIFIED | utils.ts lines 12-17: `export function toLocalDateISO(d: Date)` using `d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()` |
| 2 | Zero `.toISOString()` calls in TemplateModal.svelte and EventStep.svelte | VERIFIED | grep for toISOString in both files returns 0 matches |
| 3 | TemplateModal.svelte imports toLocalDateISO and uses it in apply() for all date conversions | VERIFIED | Line 5: `import { genId, toLocalDateISO } from '../utils.js'`; lines 52, 53, 71: toLocalDateISO() used for startDate, endDate, tournament.startDate |
| 4 | EventStep.svelte uses toLocalDateISO in all 6 $effect blocks (3 inbound + 3 outbound) | VERIFIED | Line 3 import; lines 31, 38, 45 (inbound); lines 53, 56, 59 (outbound) — all use toLocalDateISO |
| 5 | registrationDateObj Datepicker in EventStep uses explicit event handler (not bind:value) | VERIFIED | EventStep.svelte line 150: `onselect={(d) => { registrationDateObj = d instanceof Date ? d : undefined }}` |
| 6 | TournamentForm.svelte shows a Datepicker for startDate before the TimeInput | VERIFIED | TournamentForm.svelte: Datepicker (lines 104-110) + TimeInput (line 111) in flex layout; startDateObj state + inbound/outbound $effect; toLocalDateISO used |
| 7 | save/+server.ts writes start_date in both INSERT and UPDATE tournament paths | VERIFIED | Lines 94+97 (UPDATE path INSERT), 126+129 (INSERT path) — `start_date` in column list, `${t.startDate \|\| null}` as value |
| 8 | publish/+server.ts writes start_date in both INSERT and UPDATE tournament paths | VERIFIED | Lines 111+114, 147+150 — same pattern as save |
| 9 | edit/+page.server.ts reads start_date::text and maps to tournament.startDate | VERIFIED | Line 38: `start_date::text`; line 125: `startDate: t.start_date ?? undefined` |
| 10 | All SQL SELECT results in server files validated with Zod schemas (no inline type aliases) | VERIFIED | events/+page.server.ts: z.array(EventRowSchema).parse(); edit/+page.server.ts: EventDetailRowSchema, TournamentRowSchema, PhaseRowSchema, EventEntityRowSchema; admin/+page.server.ts: EntityWithParentSchema; admin/entities/new: EntityRowSchema. No `type EventRow = {...}` inline aliases remain. |
| 11 | CLAUDE.md documents the Zod SQL validation convention | VERIFIED | CLAUDE.md line 35-50: `### Validation des résultats SQL` section with pattern, centralized schema paths, z.infer<> rule, JSONB guidance |

**Score:** 11/11 gap-closure truths verified

### Gap-Closure Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/front/src/lib/tournament/utils.ts` | toLocalDateISO(d: Date): string | VERIFIED | Lines 12-17; uses getFullYear/getMonth/getDate; exported |
| `packages/front/src/lib/tournament/components/TemplateModal.svelte` | toLocalDateISO used in apply(); style="toto" removed | VERIFIED | Lines 5, 52, 53, 71 use toLocalDateISO; no toISOString(); no style="toto" |
| `packages/front/src/lib/tournament/components/EventStep.svelte` | 6 toLocalDateISO calls; registrationDateObj uses onselect | VERIFIED | Import line 3; 6 usages across 6 $effect blocks; onselect handler line 150 |
| `packages/front/src/lib/tournament/components/TournamentForm.svelte` | Datepicker for startDate + inbound/outbound $effect + toLocalDateISO | VERIFIED | Lines 4-31: Datepicker import, toLocalDateISO import, startDateObj state, 2 $effect blocks; Datepicker rendered line 104-110 |
| `packages/front/src/lib/server/schemas/event-schemas.ts` | EventRowSchema, EventDetailRowSchema, TournamentRowSchema, PhaseRowSchema (with z.preprocess for tiers), EventEntityRowSchema | VERIFIED | 88 lines; all 5 schemas exported; PhaseRowSchema.tiers uses z.preprocess with JSON.parse fallback; z.infer<> types exported |
| `packages/front/src/lib/server/schemas/entity-schemas.ts` | EntityRowSchema, EntityWithParentSchema | VERIFIED | 26 lines; both schemas with z.infer<> types; EntityTypeSchema enum |
| `packages/db/src/schemas.ts` | CheckRoleRowSchema, UserRoleRowSchema | VERIFIED | 27 lines; both schemas exported; UserRoleRowSchema uses EntityRoleSchema enum |
| `packages/db/src/authz.ts` | checkRole() and getUserRoles() use Zod validation from schemas.ts | VERIFIED | Line 3: import from ./schemas.js; line 44: z.array(CheckRoleRowSchema).parse(); line 59: z.array(UserRoleRowSchema).parse() |
| `CLAUDE.md` | Zod convention documented under Conventions | VERIFIED | Lines 35-50: full section with pattern, paths, z.infer<> rule, JSONB example |

### Gap-Closure Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TemplateModal.svelte toLocalDateISO | utils.ts | `import { genId, toLocalDateISO } from '../utils.js'` | WIRED | Line 5 confirmed; 3 call sites in apply() |
| EventStep.svelte outbound $effect | event.startDate / event.endDate / event.registrationOpensAt | `toLocalDateISO(dateObj)` | WIRED | Lines 53, 56, 59 — all use toLocalDateISO |
| EventStep.svelte inbound $effect | startDateObj comparison | `toLocalDateISO` for propIso === localIso guard | WIRED | Lines 31, 38, 45 — all use toLocalDateISO |
| TournamentForm.svelte Datepicker | tournament.startDate | outbound $effect toLocalDateISO | WIRED | Line 31: `tournament.startDate = startDateObj ? toLocalDateISO(startDateObj) : undefined` |
| tournament.startDate | save/+server.ts | JSON body tournaments[].startDate → `${t.startDate \|\| null}` | WIRED | Lines 97, 129 in save/+server.ts |
| edit/+page.server.ts start_date::text | Tournament.startDate | `startDate: t.start_date ?? undefined` | WIRED | Line 38 (cast), line 125 (mapping) |
| events/+page.server.ts | EventRowSchema | `z.array(EventRowSchema).parse(rawEvents)` | WIRED | Line 52; import line 6 |
| edit/+page.server.ts | PhaseRowSchema | `z.array(PhaseRowSchema).parse(rawPhaseRows)` | WIRED | Line 59; tiers JSONB handled by z.preprocess in schema |
| authz.ts checkRole() | CheckRoleRowSchema | `z.array(CheckRoleRowSchema).parse(result)` | WIRED | Line 44 |
| authz.ts getUserRoles() | UserRoleRowSchema | `z.array(UserRoleRowSchema).parse(result)` | WIRED | Line 59 |

### Requirements Coverage (Gap Closure)

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EVENT-01 | 02-06, 02-07, 02-08 | Organisateur peut créer un événement (nom, dates, lieu, entité) et le persister | SATISFIED | Timezone bug fixed (toLocalDateISO); registrationOpensAt datepicker now retains value; Zod validates all SQL results at the boundary |
| EVENT-02 | 02-07, 02-08 | Plusieurs tournois dans un même événement | SATISFIED | TournamentForm now shows startDate Datepicker; start_date round-trips through save/publish/edit; Zod validates tournament rows |
| EVENT-03 | 02-08 | Phases de tournoi (4 types) | SATISFIED | PhaseRowSchema.tiers uses z.preprocess — tiers JSONB parsed correctly by schema, JSON.parse removed from edit/+page.server.ts |
| EVENT-04 | 02-06 | Template de création rapide | SATISFIED | TemplateModal no longer uses toISOString(); all template date conversions use toLocalDateISO() |

### Anti-Patterns Found (Gap Closure)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| EventStep.svelte | 150 | `onselect` (not `bind:value`) on registrationDateObj Datepicker | Info | Intentional — `bind:value` did not retain selection for this Datepicker instance; `onselect` with instanceof Date guard is the correct fix |

No blockers found. The `style="toto"` cosmetic leftover noted in the previous verification has been removed from TemplateModal.svelte. TypeScript passes (`pnpm typecheck` clean, `tsc --noEmit` in front package returns 0 errors).

### Human Verification Required (Gap Closure)

#### 1. Timezone date selection — TemplateModal

**Test:** In a browser with timezone set to UTC+1 (France), open TemplateModal in /events/new. Select "Tournoi de Comité". Pick 01/01/2026 as start date. Click "Appliquer le template".
**Expected:** EventStep shows startDate 01/01/2026, endDate 01/01/2026 — not 31/12/2025.
**Why human:** Off-by-one timezone bug only manifests in UTC+ locales at browser render time; cannot verify the Date object's local value statically.

#### 2. registrationOpensAt datepicker retains selection

**Test:** On EventStep in /events/new, click the "Ouverture des inscriptions" datepicker. Select any date. Click elsewhere to dismiss the datepicker.
**Expected:** The selected date appears in the field and is retained — the field does not go blank.
**Why human:** The `onselect` handler reactivity requires a browser interaction cycle; static analysis confirms the handler is wired but cannot confirm the Datepicker fires onselect on date click.

#### 3. Tournament startDate Datepicker renders and persists

**Test:** Add a tournament in the wizard. Observe the "Date et heure de début" row. Click the date Datepicker, pick a date, click the time input.
**Expected:** Datepicker for date appears before the TimeInput in a flex layout. Selected date persists. When the form is saved (`/events/new/save`), the tournament's `start_date` column in DB is populated.
**Why human:** Requires browser rendering of the flex layout and DB inspection after save.

#### 4. Zod parse errors are surfaced at runtime

**Test:** With a running dev server and valid DB, load /events (events list) and /events/[id]/edit.
**Expected:** Pages load without 500 errors, meaning EventRowSchema and PhaseRowSchema are compatible with the actual DB row shapes (no ZodError thrown). Tiers JSONB from phase table is correctly parsed into BracketTier[] by z.preprocess.
**Why human:** Requires a live DB with phase rows that have tiers JSONB data to confirm z.preprocess handles both string and already-parsed object shapes.

### Gaps Summary (Gap Closure)

No gaps. All 11 gap-closure must-haves verified. The four UAT gaps from 02-UAT.md are resolved:

1. **UTC timezone bug** (UAT gap 2) — `toLocalDateISO()` utility created; all `.toISOString().slice(0,10)` calls replaced in TemplateModal.svelte and EventStep.svelte (6 occurrences). TemplateModal.svelte cosmetic `style="toto"` also cleaned up.

2. **registrationOpensAt datepicker** (UAT gap 3) — `bind:value={registrationDateObj}` replaced with `onselect={(d) => { registrationDateObj = d instanceof Date ? d : undefined }}` in EventStep.svelte.

3. **Tournament startDate UI** (UAT gap 4) — Datepicker added to TournamentForm.svelte before TimeInput in flex layout; inbound/outbound $effect blocks with toLocalDateISO; start_date confirmed in save/publish INSERT + edit SELECT.

4. **Zod schemas for all SQL queries** (UAT gap 1) — `packages/front/src/lib/server/schemas/` created with event-schemas.ts and entity-schemas.ts; `packages/db/src/schemas.ts` created; authz.ts wired to CheckRoleRowSchema and UserRoleRowSchema; all 4 server route files use z.array(Schema).parse(); inline type aliases removed; CLAUDE.md documents the convention.

---

## Full Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EVENT-01 | 02-01 to 02-08 | Organisateur peut créer un événement (nom, dates, lieu, entité) et le persister | SATISFIED | Complete stack: schema, save/publish endpoints, edit route, date bug fixed, Zod validation at boundary |
| EVENT-02 | 02-01, 02-02, 02-03, 02-04, 02-07, 02-08 | Plusieurs tournois dans un même événement | SATISFIED | tournament table with event_id FK; save/publish loop; TournamentStep; edit load; startDate UI added; Zod validates tournament rows |
| EVENT-03 | 02-01, 02-02, 02-03, 02-04, 02-08 | Phases de tournoi (4 types) | SATISFIED | PhaseType union; insertPhases(); phases loaded from phase table; AddPhaseMenu with 4 types; tiers JSONB parsed by Zod schema |
| EVENT-04 | 02-02, 02-06 | Template de création rapide | SATISFIED | TemplateModal with EVENT_TEMPLATES; apply() pre-fills event+tournaments; timezone bug fixed; toLocalDateISO used throughout |
| EVENT-05 | 02-03, 02-04, 02-05 | Prévisualiser et publier (statut "ouvert aux inscriptions") | SATISFIED | validateForPublish; status='ready' transition from draft; PublishStep recap; descriptive 403; events list shows status badges |
| EVENT-06 | 02-01, 02-03, 02-04 | Activer/désactiver assignation automatique des arbitres | SATISFIED | autoReferee: boolean in types; auto_referee BOOLEAN in 007; Toggle in TournamentForm; persisted in save/publish/edit |

All 6 requirements satisfied. No orphaned requirements.

---

_Verified: 2026-03-02T00:30:00Z (initial wave 2+3)_
_Re-verified: 2026-03-02T14:00:00Z (gap closure — plans 02-06, 02-07, 02-08)_
_Verifier: Claude (gsd-verifier)_
