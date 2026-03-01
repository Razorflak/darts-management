# Phase 2: Wizard Persistence - Research (Revised)

**Researched:** 2026-03-02
**Domain:** SvelteKit full-stack persistence, PostgreSQL schema migration, wizard UX patterns
**Confidence:** HIGH

> **Revision note:** This document supersedes the 2026-03-01 research. Phase 2 was completed (18/18 verification truths, all requirements satisfied) using `phases JSONB` storage. The CONTEXT.md was revised on 2026-03-02 with critical new decisions: dedicated `phase` table (replaces JSONB), edit `ready`/`started` events, readonly EventStep for started, clickable breadcrumb, and PublishStep checkbox removal. Re-planning is required to implement these decisions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation & URLs**
- Le wizard migre sous le groupe `(app)` : route `(app)/events/new`
- La liste des événements : `(app)/events`
- La navbar reçoit un lien "Événements" pointant vers `/events`
- Après "Publier" : redirection vers `/events` (liste des événements)
- Après "Enregistrer" : redirection vers `/events` également (ou reste sur le wizard — Claude choisit ce qui est le plus naturel)
- L'ancienne route `/tournaments/new` est supprimée

**Statuts de l'événement**
Cycle : `draft` → `ready` → `started` → `finished`
- `draft` : événement sauvegardé mais non visible — seul l'organisateur peut le voir dans sa liste
- `ready` : événement publié, visible pour les inscriptions si `registration_opens_at` est dépassée (ou nulle = ouverture immédiate)
- `started` : tournoi lancé (Phase 4) — configuration verrouillée
- `finished` : tournoi terminé (Phase 5/6)

**Champ `registration_opens_at`**
- Champ date optionnel sur l'événement (pas sur les tournois individuels)
- Nom de colonne SQL : `registration_opens_at`
- Logique d'ouverture : statut `ready` ET (`registration_opens_at IS NULL` OU `today >= registration_opens_at`)
- Si `registration_opens_at IS NULL` : inscriptions ouvertes dès la publication
- Pas de job automatique côté serveur — la visibilité est calculée à la lecture (check côté serveur dans le load)

**Édition selon le statut**
- Les événements en statut `draft`, `ready` ET `started` sont éditables depuis la liste des événements
- Seul `finished` est verrouillé (lecture seule / non accessible en édition)
- Si statut `started` : les champs de l'étape 1 (EventStep — nom, dates, lieu, entité, registration_opens_at) sont en **lecture seule** — les tournois (step 2) restent modifiables
- La route `/events/[id]/edit` lève le filtre `AND status = 'draft'` → accepte `draft`, `ready`, `started`

**Navigation dans le wizard (fil d'Ariane)**
- Les étapes du Breadcrumb sont **cliquables** : l'utilisateur peut naviguer directement vers n'importe quelle étape
- Pas de validation bloquante à la navigation — l'utilisateur navigue librement
- Le step courant reste mis en évidence visuellement

**Bouton "Enregistrer"**
- Présent à chaque step du wizard (pas seulement au PublishStep)
- Sauvegarde l'état courant — validation minimale (nom de l'événement suffisant)
- Pour `ready` et `started` : "Enregistrer" met à jour sans changer le statut

**Bouton "Publier"**
- Uniquement sur le PublishStep (step 3)
- Visible uniquement si statut `draft` (pour passer à `ready`)
- Si déjà `ready` ou `started` : le PublishStep affiche uniquement un résumé et le bouton "Enregistrer"
- Validation complète côté serveur avant de passer à `ready`
- En cas d'erreur serveur : message inline dans le PublishStep

**PublishStep — suppression des checkboxes**
- Les 2 checkboxes "Notifier les membres" et "Ouvrir les inscriptions" sont **supprimées**
- Le PublishStep affiche uniquement un résumé de l'événement + bouton Publier (ou Enregistrer si déjà publié)

**Validation**
- Validation uniquement à la soumission finale ("Publier")
- L'utilisateur peut naviguer librement entre les steps sans blocage
- "Enregistrer" : validation minimale — nom requis pour identifier l'événement

**Liste des événements (`/events`)**
- Affichage en cards (une par événement)
- Infos par card : nom, dates, lieu, entité organisatrice, statut, nombre de tournois
- Scope : événements où l'utilisateur est organisateur ou admin
- Tri : par date de début décroissante
- Draft visibles uniquement par leur créateur

**Entité organisatrice**
- Le sélecteur dans EventStep est populé depuis `getUserRoles` : entités où l'utilisateur a un rôle `organisateur`, `adminClub`, `adminComite`, `adminLigue`, ou `adminFederal`
- La valeur stockée est l'UUID de l'entité (pas son label)

**Stockage des phases de tournoi — RÉVISÉ (décision clé)**
Les phases sont stockées dans une **table dédiée `phase`** (et non plus en colonne JSONB dans `tournament`).

Schéma de la table :
```sql
CREATE TABLE phase (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL,
  type                 TEXT NOT NULL,         -- round_robin | double_loss_groups | single_elim | double_elim
  entrants             INTEGER NOT NULL,
  -- Poules (round_robin + double_loss_groups)
  players_per_group    INTEGER,
  qualifiers_per_group INTEGER,
  -- Brackets (single_elim + double_elim)
  qualifiers           INTEGER,               -- qualifiés vers phase suivante (NULL = phase finale)
  tiers                JSONB,                 -- [{id, round, legs}]
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Conséquences :
- La colonne `phases JSONB` de la table `tournament` est supprimée
- Les routes save/publish insèrent dans `phase` (DELETE + re-INSERT à chaque save)
- Le load de l'edit page fait un JOIN ou une requête séparée sur `phase ORDER BY position`
- Le mapping DB → TypeScript `Phase[]` se fait depuis les lignes de `phase`

### Claude's Discretion

- Structure exacte des tables SQL `event` et `tournament` (à dériver des types TypeScript existants)
- UX exacte du bouton "Enregistrer" dans le wizard (position, libellé, comportement si aucun nom saisi)
- Gestion des erreurs réseau

### Deferred Ideas (OUT OF SCOPE)

- Cache localStorage pour reprendre l'édition en cours de session — hors scope v1
- Modification d'un événement existant post-publication — phase ultérieure
- Duplication d'événement — phase ultérieure
- Filtres / recherche dans la liste des événements — Phase 6 ou ultérieure
- Job automatique pour déclencher l'ouverture des inscriptions à la date prévue — v1.1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVENT-01 | L'organisateur peut créer un événement (nom, dates, lieu, entité organisatrice) et le persister | Already implemented. Schema revision (phase table) and edit-status expansion require endpoint + route updates. |
| EVENT-02 | L'organisateur peut configurer plusieurs tournois dans un même événement (un par catégorie) | Already implemented. Phase table migration impacts tournament save logic — phase rows inserted per tournament. |
| EVENT-03 | L'organisateur peut configurer les phases d'un tournoi — 4 types avec groupes nommés (Poule A, B...) | Implemented as JSONB. Schema revision requires mapping Phase[] to/from dedicated `phase` rows per the type mapping patterns below. |
| EVENT-04 | L'organisateur peut utiliser un template de création rapide | Already implemented (templates.ts). Not impacted by schema change — Phase[] objects built in memory, serialized to rows at save time. |
| EVENT-05 | L'organisateur peut prévisualiser et publier l'événement (statut "ouvert aux inscriptions") | Already implemented. PublishStep checkboxes removal and Publish button gating on `draft` status are required. |
| EVENT-06 | L'organisateur peut activer ou désactiver l'assignation automatique des arbitres pour un tournoi | Already implemented (autoReferee toggle). No change required. |
</phase_requirements>

---

## Summary

Phase 2 was previously completed (18/18 verification truths, all requirements satisfied) using `phases JSONB` storage in the `tournament` table. The CONTEXT.md was revised on 2026-03-02 to mandate a dedicated `phase` table replacing the JSONB column. Additionally, three UX decisions were added or revised: editing `ready` and `started` events (not just `draft`), readonly EventStep when status is `started`, and clickable breadcrumb navigation.

The re-planning work is surgical and additive. Plan 02-08 (pending working-tree commit) is already written and handles the uncommitted files. The new plans must: (a) migrate the schema from JSONB to a normalized `phase` table, (b) update save/publish/edit endpoints to use the new table, (c) expand the edit route to allow `ready` and `started` events, (d) add a readonly mode to EventStep, (e) make the Breadcrumb clickable, and (f) remove the two checkboxes from PublishStep.

The implementation follows established project patterns throughout: raw SQL via `postgres.js` tagged templates, `sql.begin()` for transactions, `getUserRoles` authz, Svelte 5 runes, Flowbite-Svelte UI components, and the pattern of using `$props()` / `$state()` / `$effect()` for component communication. No new dependencies are required.

**Primary recommendation:** Execute in three waves — (1) schema migration + endpoint update (highest risk, must be first), (2) edit-route expansion + EventStep readonly mode, (3) Breadcrumb + PublishStep cleanup (lowest risk, can parallelize with wave 2).

---

## Current Implementation State

### What Exists (VERIFIED — fully committed after 02-08)

| File | Purpose | Revision Status |
|------|---------|----------------|
| `packages/db/src/schema/006_event.sql` | event table with status enum, registration_opens_at | No change needed |
| `packages/db/src/schema/007_tournament.sql` | tournament table with `phases JSONB NOT NULL DEFAULT '[]'` | `phases` column must be removed by new migration |
| `packages/front/src/lib/tournament/types.ts` | EventData, Tournament, Phase union types | No change needed — types already match new schema |
| `packages/front/src/routes/(app)/events/new/save/+server.ts` | Draft save (INSERT/UPDATE + tournament inserts with `JSON.stringify(t.phases)`) | Must serialize phases into `phase` table rows instead |
| `packages/front/src/routes/(app)/events/new/publish/+server.ts` | Publish (validate + status='ready' transition) | Must serialize phases into `phase` table rows instead |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts` | Load draft event for editing (`status = 'draft'` filter) | Must accept `ready`/`started`; must load `phase` rows; must return `status` |
| `packages/front/src/routes/(app)/events/[id]/edit/+page.svelte` | Edit wizard (draft only, no readonly) | Must condition Publish button on draft; must pass `readonly`/`eventStatus` to children |
| `packages/front/src/routes/(app)/events/new/+page.svelte` | Creation wizard | Must wire clickable breadcrumb |
| `packages/front/src/routes/(app)/events/+page.svelte` | Events list with Reprendre link for drafts only | Must add edit links for `ready`/`started` events |
| `packages/front/src/lib/tournament/components/Breadcrumb.svelte` | Visual step indicator (not clickable) | Must become clickable |
| `packages/front/src/lib/tournament/components/PublishStep.svelte` | Recap + options checkboxes + Publish/Prev buttons | Must remove 2 checkboxes; must condition Publish button on `eventStatus` |
| `packages/front/src/lib/tournament/components/EventStep.svelte` | Event fields form | Must support `readonly` prop (fieldset disabled) |
| `packages/front/src/lib/tournament/templates.ts` | EVENT_TEMPLATES array | No change needed |

### What Does Not Exist Yet

| Artifact | Required By |
|----------|------------|
| `packages/db/src/schema/008_phase_table.sql` | All phase-related save/load logic |
| Phase row serialization in save/publish endpoints | JSONB → normalized phase rows |
| Phase row loading (phase rows → Phase[]) in edit load | Edit route returning correct Phase[] |
| Edit links for `ready`/`started` events in /events list | Editing published events |
| Readonly mode in EventStep (fieldset disabled) | Started event editing |
| `status` prop returned from edit load | Gating readonly/publish visibility in page |
| Status-conditioned Publish button in PublishStep | Different behavior by status |
| Clickable Breadcrumb steps | Free navigation UX |

---

## Standard Stack

### Core (all existing, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| postgres.js | 3.x | Raw SQL via tagged template literals | Project standard — `sql` instance from `$lib/server/db` |
| SvelteKit | 2.x | Server routes, page load functions | Project framework |
| Svelte 5 | 5.x | Runes (`$state`, `$props`, `$derived`, `$effect`) | Project framework |
| Flowbite-Svelte | 1.x | UI components (Badge, Button, Card, etc.) | Project UI library |
| node-pg-migrate | current | SQL migrations via numbered SQL files in `packages/db/src/schema/` | Already used for migrations 001-007 |

**Installation:** No new packages needed — all required libraries are already in the project.

---

## Architecture Patterns

### Pattern 1: Phase Table Row Serialization

**What:** Convert `Phase[]` (TypeScript) → individual `phase` rows on save, and `phase` rows → `Phase[]` on load.

**Critical naming distinction:** The TypeScript `GroupPhase.qualifiers` field means "qualifiers per group". In SQL, this maps to `qualifiers_per_group`. The SQL `qualifiers` column is reserved for EliminationPhase only (total players advancing to the next phase).

```typescript
// TypeScript → SQL row

function phaseToInsertParams(phase: Phase, tournamentId: string, position: number) {
  const isGroup = phase.type === 'round_robin' || phase.type === 'double_loss_groups'
  if (isGroup) {
    const g = phase as GroupPhase
    return {
      tournament_id: tournamentId,
      position,
      type: g.type,
      entrants: g.entrants,
      players_per_group: g.playersPerGroup,
      qualifiers_per_group: g.qualifiers,   // GroupPhase.qualifiers = per-group count
      qualifiers: null,                      // not used for group phases
      tiers: null,
    }
  } else {
    const e = phase as EliminationPhase
    return {
      tournament_id: tournamentId,
      position,
      type: e.type,
      entrants: e.entrants,
      players_per_group: null,
      qualifiers_per_group: null,
      qualifiers: e.qualifiers ?? null,      // null = final phase
      tiers: JSON.stringify(e.tiers),
    }
  }
}
```

```typescript
// SQL row → TypeScript

type PhaseRow = {
  id: string
  tournament_id: string
  position: number
  type: string
  entrants: number
  players_per_group: number | null
  qualifiers_per_group: number | null
  qualifiers: number | null
  tiers: unknown
}

function rowToPhase(row: PhaseRow): Phase {
  if (row.type === 'round_robin' || row.type === 'double_loss_groups') {
    return {
      id: row.id,
      type: row.type as GroupPhase['type'],
      entrants: row.entrants,
      playersPerGroup: row.players_per_group!,
      qualifiers: row.qualifiers_per_group!,  // per-group count → GroupPhase.qualifiers
    } satisfies GroupPhase
  } else {
    return {
      id: row.id,
      type: row.type as EliminationPhase['type'],
      entrants: row.entrants,
      tiers: row.tiers as BracketTier[],
      qualifiers: row.qualifiers ?? undefined,
    } satisfies EliminationPhase
  }
}
```

### Pattern 2: DELETE + re-INSERT via CASCADE (Save Pattern)

**What:** On every save, tournament rows are deleted and re-inserted. Phase rows are deleted automatically by `ON DELETE CASCADE`. No explicit phase DELETE is needed.

**Why DELETE+re-INSERT:** The wizard allows adding/removing/reordering phases freely. Delta reconciliation is complex. DELETE+re-INSERT is correct and safe inside a transaction.

```typescript
// Inside sql.begin() transaction:

// 1. Delete existing tournaments (phases cascade-deleted automatically)
await tx`DELETE FROM tournament WHERE event_id = ${eventId}`

// 2. Re-insert each tournament
for (const t of body.tournaments) {
  const [{ id: tournamentId }] = await tx`
    INSERT INTO tournament (event_id, name, club, category, quota, start_time, start_date, auto_referee)
    VALUES (
      ${eventId}, ${t.name}, ${t.club || null}, ${t.category || null},
      ${t.quota}, ${t.startTime || ''}, ${t.startDate || null},
      ${t.autoReferee ?? false}
    )
    RETURNING id
  `
  // 3. Insert phase rows for this tournament
  for (let pos = 0; pos < t.phases.length; pos++) {
    const p = phaseToInsertParams(t.phases[pos], tournamentId, pos)
    await tx`
      INSERT INTO phase (tournament_id, position, type, entrants,
                         players_per_group, qualifiers_per_group,
                         qualifiers, tiers)
      VALUES (
        ${p.tournament_id}, ${p.position}, ${p.type}, ${p.entrants},
        ${p.players_per_group}, ${p.qualifiers_per_group},
        ${p.qualifiers}, ${p.tiers}
      )
    `
  }
}
```

**Important:** The `tournament` INSERT no longer has a `phases` column. Remove `phases` from all tournament INSERT statements.

### Pattern 3: Load Phases with Separate Query + Map Grouping

**What:** When loading an event for editing, fetch all phase rows for the event's tournaments, then group by `tournament_id`.

```typescript
// After loading tournamentRows in +page.server.ts:

const phaseRows = await sql<PhaseRow[]>`
  SELECT p.id, p.tournament_id, p.position, p.type, p.entrants,
         p.players_per_group, p.qualifiers_per_group,
         p.qualifiers, p.tiers
  FROM phase p
  JOIN tournament t ON t.id = p.tournament_id
  WHERE t.event_id = ${eventId}
  ORDER BY p.tournament_id, p.position
`

// Group by tournament_id using a Map
const phasesByTournament = new Map<string, PhaseRow[]>()
for (const row of phaseRows) {
  const list = phasesByTournament.get(row.tournament_id) ?? []
  list.push(row)
  phasesByTournament.set(row.tournament_id, list)
}

// Build Tournament[] with phases
const tournaments: Tournament[] = tournamentRows.map((t) => ({
  id: t.id,
  name: t.name,
  club: t.club ?? '',
  quota: t.quota,
  category: t.category as Tournament['category'] ?? null,
  startTime: t.start_time ?? '',
  startDate: t.start_date ?? undefined,
  autoReferee: t.auto_referee,
  phases: (phasesByTournament.get(t.id) ?? []).map(rowToPhase),
}))
```

### Pattern 4: Edit Route Status Expansion

**What:** The edit route currently filters `AND status = 'draft'`. This must be changed to allow `draft`, `ready`, `started`.

**Current code in `edit/+page.server.ts` (line 28-31):**
```sql
WHERE id = ${eventId}
  AND organizer_id = ${locals.user.id}
  AND status = 'draft'
```

**New code:**
```sql
WHERE id = ${eventId}
  AND organizer_id = ${locals.user.id}
  AND status IN ('draft', 'ready', 'started')
```

**Must also SELECT and return `status`** so the page can condition:
- EventStep readonly mode (`status === 'started'`)
- Publish button visibility (`status === 'draft'` only)
- PublishStep behavior (`eventStatus` prop)

```typescript
// In the SELECT:
SELECT id, name, entity_id, status,
       starts_at::text, ends_at::text, location,
       registration_opens_at::text
FROM event
WHERE ...

// In the return:
return { event, tournaments, entities, eventId, status: row.status }
```

### Pattern 5: EventStep Readonly Mode (HTML fieldset)

**What:** When `readonly={true}`, EventStep disables all its form fields using a `<fieldset disabled>` wrapper.

**Why fieldset:** The `disabled` attribute on a `<fieldset>` element disables all form controls inside it — a single prop instead of adding `disabled` to each individual input. This is a native HTML feature, no library required.

```svelte
<!-- EventStep.svelte changes -->

interface Props {
  event: EventData
  entities: { id: string; name: string; type: string }[]
  readonly?: boolean    // NEW PROP
  onNext: () => void
  onCancel: () => void
}

let { event = $bindable(), entities, readonly = false, onNext, onCancel }: Props = $props()

<!-- Wrap the form content with fieldset -->
<form onsubmit={handleSubmit} class="space-y-6" novalidate>
  <fieldset disabled={readonly} class={readonly ? 'opacity-60 cursor-not-allowed' : ''}>
    <!-- All existing inputs unchanged inside -->
    <div>
      <Label for="event-name" class="mb-2">Nom de l'événement ...</Label>
      <input id="event-name" type="text" bind:value={event.name} ... />
    </div>
    <!-- etc. -->
  </fieldset>

  <!-- Actions — always visible but Next button hidden or adjusted when readonly -->
  <div class="flex justify-between pt-2">
    <Button type="button" color="alternative" pill onclick={onCancel}>Annuler</Button>
    {#if !readonly}
      <Button type="submit" color="blue" pill>Suivant →</Button>
    {:else}
      <Button type="button" color="blue" pill onclick={onNext}>Suivant →</Button>
    {/if}
  </div>
</form>
```

**Svelte 5 note:** `bind:value` on a `disabled` input still works — the binding tracks the JS variable; `disabled` prevents user interaction only. The `$effect` inbound sync for Datepicker still fires correctly.

**Visual note:** A disabled `<Datepicker>` from Flowbite-Svelte may not respond to the `fieldset disabled` propagation because it uses internal shadow DOM or complex rendering. Test and add `disabled={readonly}` directly to the Datepicker component if needed.

### Pattern 6: Clickable Breadcrumb

**What:** Add `onStepClick: (step: WizardStep) => void` prop to Breadcrumb. Wrap each step item in a `<button>`.

**Current Breadcrumb:** Visual only — uses `<div>` for step bubbles.

```svelte
<!-- Breadcrumb.svelte changes -->

interface Props {
  step: WizardStep
  onStepClick: (s: WizardStep) => void   // NEW PROP
}

let { step, onStepClick }: Props = $props()

<!-- Replace the step <div> with <button> -->
{#each steps as s, i}
  <li class="flex items-center">
    <button
      type="button"
      onclick={() => onStepClick(s.step)}
      class="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-80"
      aria-current={step === s.step ? 'step' : undefined}
    >
      <!-- Existing pastille div — unchanged -->
      <div class={[ /* existing classes */ ].join(' ')}>
        <!-- existing checkmark / number -->
      </div>
      <!-- Existing label span — unchanged -->
      <span class={[ /* existing classes */ ].join(' ')}>{s.label}</span>
    </button>

    <!-- Separator line unchanged -->
    {#if i < steps.length - 1}
      <div class="mx-4 h-px w-12 ..."></div>
    {/if}
  </li>
{/each}
```

**Wire in both wizard pages:**

```svelte
<!-- In /events/new/+page.svelte and /events/[id]/edit/+page.svelte -->
<Breadcrumb {step} onStepClick={(s) => (step = s)} />
```

### Pattern 7: PublishStep — Status-Conditional Publish Button

**What:** Remove checkboxes; show Publish button only when `eventStatus === 'draft'`.

```svelte
<!-- PublishStep.svelte changes -->

interface Props {
  event: EventData
  tournaments: Tournament[]
  eventStatus: 'draft' | 'ready' | 'started' | 'finished'   // NEW PROP (replaces options)
  onPrev: () => void
  onPublish: () => void
  publishError?: string
}

let { event, tournaments, eventStatus, onPrev, onPublish, publishError }: Props = $props()

<!-- Remove the "Options de publication" Card block entirely -->
<!-- Remove Checkbox import -->

<!-- Conditional action buttons -->
<div class="flex justify-between pt-2">
  <Button color="alternative" pill onclick={onPrev}>← Modifier</Button>
  {#if eventStatus === 'draft'}
    <Button color="blue" pill onclick={onPublish}>Publier</Button>
  {/if}
</div>
```

**Also remove from wizard pages:**
- `bind:options={publishOptions}` — no longer a prop
- `let publishOptions = $state<PublishOptions>({...})` — no longer needed
- The `PublishOptions` type import from `types.ts` (the type itself can stay in types.ts for backward compat)

### Pattern 8: Save Endpoint — No Status Change for Non-Draft

**What:** The save endpoint must NOT change the status of a `ready` or `started` event. It must also skip updating event fields when status is `started` (readonly on client, enforced on server).

**Current ownership check (save/+server.ts line 47-50):**
```typescript
const [existing] = await tx`
  SELECT organizer_id FROM event WHERE id = ${eventId} AND status = 'draft'
`
```

**New ownership check (accepts ready + started):**
```typescript
const [existing] = await tx`
  SELECT organizer_id, status FROM event
  WHERE id = ${eventId}
    AND status IN ('draft', 'ready', 'started')
`
if (!existing || existing.organizer_id !== locals.user!.id) {
  throw new Error('Forbidden')
}
```

**Skip event fields update for started status (server-side enforcement):**
```typescript
// Update event fields only when NOT started
if (existing.status !== 'started') {
  await tx`
    UPDATE event SET
      name = ${body.event.name.trim()},
      entity_id = ${body.event.entity},
      starts_at = ${body.event.startDate || null},
      ends_at = ${body.event.endDate || null},
      location = ${body.event.location || ''},
      registration_opens_at = ${body.event.registrationOpensAt || null},
      updated_at = now()
    WHERE id = ${eventId}
  `
}
// Tournament + phase rows always replaced (regardless of status)
await tx`DELETE FROM tournament WHERE event_id = ${eventId}`
// ... insert tournaments + phases
```

### Pattern 9: Events List — Edit Links for All Non-Finished Statuses

**What:** Replace the draft-only Reprendre link with a link for all non-finished events.

```svelte
<!-- In /events/+page.svelte -->

<!-- Replace: -->
{#if event.status === 'draft'}
  <div class="mt-3 border-t border-gray-100 pt-3">
    <a href="/events/{event.id}/edit" class="text-sm font-medium text-blue-600 hover:text-blue-800">
      Reprendre l'édition →
    </a>
  </div>
{/if}

<!-- With: -->
{#if event.status !== 'finished'}
  <div class="mt-3 border-t border-gray-100 pt-3">
    <a href="/events/{event.id}/edit" class="text-sm font-medium text-blue-600 hover:text-blue-800">
      {event.status === 'draft' ? "Reprendre l'édition" : 'Modifier'} →
    </a>
  </div>
{/if}
```

### Anti-Patterns to Avoid

- **JSONB phase storage going forward:** After migration, the `phases JSONB` column will not exist. Never `JSON.stringify(t.phases)` into a tournament INSERT.
- **Explicit DELETE FROM phase:** Phase rows are deleted by CASCADE when tournament rows are deleted. Adding `DELETE FROM phase WHERE tournament_id = ...` before deleting tournaments is redundant and may cause FK ordering issues.
- **Not returning `status` from edit load:** The page needs `data.status` to pass `readonly` to EventStep and `eventStatus` to PublishStep.
- **`$state(data.x)` pattern warning:** Svelte 5 warns on `let status = $state(data.status)` but this is the correct pattern for server-initialized client state. Log it, don't fight it.
- **Skipping server-side status enforcement:** Even though EventStep is readonly in the UI, the save endpoint must also check `status !== 'started'` before updating event fields.

---

## Schema Migration: `008_phase_table.sql`

```sql
-- Migration 008: Replace phases JSONB column with dedicated phase table

-- Step 1: Create phase table
CREATE TABLE phase (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL,
  type                 TEXT NOT NULL,          -- round_robin | double_loss_groups | single_elim | double_elim
  entrants             INTEGER NOT NULL,
  -- Group phase columns (round_robin + double_loss_groups)
  players_per_group    INTEGER,
  qualifiers_per_group INTEGER,
  -- Elimination phase columns (single_elim + double_elim)
  qualifiers           INTEGER,               -- qualifiers advancing to next phase; NULL = final phase
  tiers                JSONB,                 -- BracketTier[]: [{id, round, legs}]
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX phase_tournament_idx ON phase(tournament_id);
CREATE INDEX phase_position_idx ON phase(tournament_id, position);

-- Step 2: Migrate existing phase data from tournament.phases JSONB
-- TypeScript field names in JSONB: type, entrants, playersPerGroup, qualifiers, tiers
-- GroupPhase.qualifiers = per-group count → qualifiers_per_group column
-- EliminationPhase.qualifiers = total advancing → qualifiers column
INSERT INTO phase (tournament_id, position, type, entrants,
                   players_per_group, qualifiers_per_group,
                   qualifiers, tiers)
SELECT
  t.id AS tournament_id,
  (ordinality - 1)::integer AS position,
  (p->>'type') AS type,
  (p->>'entrants')::integer AS entrants,
  CASE WHEN p->>'type' IN ('round_robin', 'double_loss_groups')
       THEN (p->>'playersPerGroup')::integer
       ELSE NULL END AS players_per_group,
  CASE WHEN p->>'type' IN ('round_robin', 'double_loss_groups')
       THEN (p->>'qualifiers')::integer
       ELSE NULL END AS qualifiers_per_group,
  CASE WHEN p->>'type' IN ('single_elim', 'double_elim')
       THEN (p->>'qualifiers')::integer
       ELSE NULL END AS qualifiers,
  CASE WHEN p->>'type' IN ('single_elim', 'double_elim')
       THEN (p->'tiers')
       ELSE NULL END AS tiers
FROM tournament t,
     jsonb_array_elements(t.phases) WITH ORDINALITY AS arr(p, ordinality)
WHERE jsonb_array_length(t.phases) > 0;

-- Step 3: Drop the now-redundant phases column from tournament
ALTER TABLE tournament DROP COLUMN phases;
```

**Migration notes:**
- `WITH ORDINALITY` provides 1-based array index — subtract 1 for 0-based `position`.
- The JSONB keys use camelCase (TypeScript field names): `playersPerGroup`, `qualifiers`, `tiers`.
- If dev DB has no phase data, the INSERT is a no-op (safe).
- `ON DELETE CASCADE` on `tournament_id` means phase rows auto-delete when tournament is deleted.
- After migration, `tournament.phases` column does not exist — any code referencing it will fail at SQL execution time (not at TypeScript compile time — raw SQL strings).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phase data migration | Custom Node.js migration script | SQL `WITH ORDINALITY` + JSONB operators | PostgreSQL handles JSONB traversal natively in a single atomic SQL statement |
| Transaction safety for save | Manual BEGIN/COMMIT/ROLLBACK | `sql.begin()` from postgres.js | Established pattern; handles rollback automatically; already used in 02-02 |
| Multi-input disable | Per-field `disabled={readonly}` | HTML `<fieldset disabled>` | One prop disables all descendant form controls |
| Phase rows → Phase[] grouping | SQL GROUP BY + JSON aggregation | `Map<string, PhaseRow[]>` grouping in TypeScript | TypeScript grouping is simpler and type-safe; avoids complex SQL aggregation |
| Step routing | SvelteKit route per step | Svelte 5 `$state<WizardStep>` + conditional render | Step is UI state, not URL state; existing pattern throughout wizard |

---

## Common Pitfalls

### Pitfall 1: GroupPhase.qualifiers vs Phase.qualifiers Column Name Collision

**What goes wrong:** The TypeScript `GroupPhase.qualifiers` field (per-group count) shares the name with the SQL `phase.qualifiers` column (total advancing to next phase for elimination only). Copying the field name directly causes silent wrong mappings — group phases get `null` qualifiers_per_group, elimination phases get wrong qualifier counts.

**Why it happens:** Two different semantic meanings share the same identifier in the TypeScript types.

**How to avoid:** In the serialization function: `GroupPhase.qualifiers` → `qualifiers_per_group` column. `EliminationPhase.qualifiers` → `qualifiers` column. Comment this clearly in the code.

**Warning signs:** Group phases showing wrong group sizes after migration; qualifiers_per_group is null for round_robin phases.

### Pitfall 2: tournament INSERT Still Has `phases` Column

**What goes wrong:** After migration runs and drops the `phases` column, save/publish endpoints fail with `column "phases" of relation "tournament" does not exist`.

**Why it happens:** Current INSERT statements include `phases` parameter: `INSERT INTO tournament (..., phases) VALUES (..., ${JSON.stringify(t.phases)})`.

**How to avoid:** Remove `phases` from all tournament INSERT column lists and parameter lists. The phase data now goes into the `phase` table separately.

**Warning signs:** SQL error at runtime on save/publish after applying migration.

### Pitfall 3: Forgetting to Return `status` from Edit Load

**What goes wrong:** Edit wizard page shows editable EventStep for started events; Publish button shows for published events.

**Why it happens:** The current edit load returns `{event, tournaments, entities, eventId}` — status is not included.

**How to avoid:** Add `status: row.status` to the SELECT and return. Use `data.status` in the page to pass `readonly={data.status === 'started'}` to EventStep and `eventStatus={data.status}` to PublishStep.

**Warning signs:** No TypeScript error — `data.status` would simply be `undefined`, silently passing falsy values to readonly props.

### Pitfall 4: Save Endpoint Still Checking `status = 'draft'`

**What goes wrong:** Organizers trying to save a published (`ready`) or in-progress (`started`) event receive 403.

**Why it happens:** Two places in save/+server.ts check `AND status = 'draft'`: the ownership verification query and implicitly the conceptual scope of the endpoint.

**How to avoid:** Change to `AND status IN ('draft', 'ready', 'started')`. Also verify that publish/+server.ts has the same expansion if called during an UPDATE path for existing events.

**Warning signs:** 403 errors on save for non-draft events.

### Pitfall 5: postgres.js TransactionSql Type Cast

**What goes wrong:** TypeScript error: `This expression is not callable` when using tagged template literals inside `sql.begin()`.

**Why it happens:** postgres.js `TransactionSql` type uses `Omit<Sql, ...>` which strips callable signatures.

**How to avoid:** Use the established project pattern: `const tx = rawTx as unknown as postgres.Sql`. Already documented in STATE.md: `[Phase 02-02]`.

**Warning signs:** TypeScript compile error on `tx\`SELECT ...\`` inside the transaction callback.

### Pitfall 6: Flowbite-Svelte Datepicker May Not Respect fieldset disabled

**What goes wrong:** EventStep shows a readonly text field for the name but the date pickers remain interactive for started events.

**Why it happens:** Some Flowbite-Svelte components render through internal wrapper elements that may not propagate the `fieldset disabled` attribute to the underlying input.

**How to avoid:** Test `<fieldset disabled>` against Datepicker in the browser. If the Datepicker remains interactive, add `disabled={readonly}` directly to each `<Datepicker>` component as a fallback.

**Warning signs:** Date fields still interactive for started events in browser testing.

### Pitfall 7: PublishStep `options` Prop Removal — Two Files

**What goes wrong:** After removing `options` prop from PublishStep, TypeScript errors in both wizard pages that still pass `bind:options={publishOptions}`.

**Why it happens:** The prop is used in three places: PublishStep component definition, /events/new/+page.svelte, and /events/[id]/edit/+page.svelte.

**How to avoid:** Remove the prop from all three files in one commit. Also remove the `publishOptions` state variable from both wizard pages and the `bind:options` in the PublishStep call.

---

## Code Examples

### Migration: JSONB → phase table (SQL)

```sql
-- Source: CONTEXT.md schema decision + PostgreSQL jsonb_array_elements WITH ORDINALITY
INSERT INTO phase (tournament_id, position, type, entrants,
                   players_per_group, qualifiers_per_group,
                   qualifiers, tiers)
SELECT
  t.id,
  (ordinality - 1)::integer,
  p->>'type',
  (p->>'entrants')::integer,
  CASE WHEN p->>'type' IN ('round_robin', 'double_loss_groups')
       THEN (p->>'playersPerGroup')::integer END,
  CASE WHEN p->>'type' IN ('round_robin', 'double_loss_groups')
       THEN (p->>'qualifiers')::integer END,
  CASE WHEN p->>'type' IN ('single_elim', 'double_elim')
       THEN (p->>'qualifiers')::integer END,
  CASE WHEN p->>'type' IN ('single_elim', 'double_elim')
       THEN p->'tiers' END
FROM tournament t,
     jsonb_array_elements(t.phases) WITH ORDINALITY AS arr(p, ordinality)
WHERE jsonb_array_length(t.phases) > 0;
```

### Save/Publish: Phase Row Insert Loop

```typescript
// Source: established postgres.js pattern + new phase table schema
// This replaces JSON.stringify(t.phases) in tournament INSERT

// After tournament INSERT RETURNING id:
for (let pos = 0; pos < t.phases.length; pos++) {
  const phase = t.phases[pos]
  const isGroup = phase.type === 'round_robin' || phase.type === 'double_loss_groups'
  if (isGroup) {
    const g = phase as GroupPhase
    await tx`
      INSERT INTO phase (tournament_id, position, type, entrants,
                         players_per_group, qualifiers_per_group)
      VALUES (${tournamentId}, ${pos}, ${g.type}, ${g.entrants},
              ${g.playersPerGroup}, ${g.qualifiers})
    `
  } else {
    const e = phase as EliminationPhase
    await tx`
      INSERT INTO phase (tournament_id, position, type, entrants,
                         qualifiers, tiers)
      VALUES (${tournamentId}, ${pos}, ${e.type}, ${e.entrants},
              ${e.qualifiers ?? null}, ${JSON.stringify(e.tiers)})
    `
  }
}
```

### Edit Load: Phase Query + Grouping

```typescript
// Source: established edit route pattern + new phase table

const phaseRows = await sql<PhaseRow[]>`
  SELECT p.id, p.tournament_id, p.position, p.type, p.entrants,
         p.players_per_group, p.qualifiers_per_group, p.qualifiers, p.tiers
  FROM phase p
  JOIN tournament t ON t.id = p.tournament_id
  WHERE t.event_id = ${eventId}
  ORDER BY p.tournament_id, p.position
`
const phasesByTournament = new Map<string, PhaseRow[]>()
for (const row of phaseRows) {
  const list = phasesByTournament.get(row.tournament_id) ?? []
  list.push(row)
  phasesByTournament.set(row.tournament_id, list)
}
```

### EventStep Readonly Wrapper

```svelte
<!-- Source: HTML spec (fieldset disabled) + Svelte 5 patterns -->
<fieldset disabled={readonly} class={readonly ? 'opacity-60' : ''}>
  <!-- existing form fields unchanged inside -->
</fieldset>
```

### Breadcrumb Click Wiring

```svelte
<!-- Source: Svelte 5 $state pattern + existing wizard page structure -->

<!-- In Breadcrumb.svelte: add onStepClick prop, wrap each step in <button> -->
<button type="button" onclick={() => onStepClick(s.step)} class="flex items-center gap-2">
  <!-- existing pastille + label unchanged -->
</button>

<!-- In wizard +page.svelte: -->
<Breadcrumb {step} onStepClick={(s) => (step = s)} />
```

---

## Implementation Wave Plan

### Wave 0: Commit pending files (Plan 02-08 — already written)

| Task | Files |
|------|-------|
| Commit post-UAT frontend fixes | templates.ts, labels.ts, AddPhaseMenu.svelte, BracketTiers.svelte, vite.config.ts |
| Commit DB seed fix | 003_seed_dev.sql |

### Wave 1: Schema migration + endpoint update (Plan 02-09)

**Scope — highest risk, must be first:**

| Task | Files | Notes |
|------|-------|-------|
| Write migration 008 | `packages/db/src/schema/008_phase_table.sql` | CREATE TABLE phase + migrate JSONB + DROP column |
| Apply migration | DB | Via node-pg-migrate |
| Update save/+server.ts | `save/+server.ts` | Remove phases from tournament INSERT; add phase row insert loop |
| Update publish/+server.ts | `publish/+server.ts` | Same phase serialization change |
| Extract shared persistence helper | `$lib/server/event-persistence.ts` (optional) | Reduce duplication in save+publish endpoints |
| Update edit load | `events/[id]/edit/+page.server.ts` | Add phase rows query + Map grouping; accept ready/started; return status |

**Verification:** `pnpm typecheck` passes; save and publish endpoints create phase rows in DB; edit page loads phases from phase table.

### Wave 2: Edit route expansion + EventStep readonly (Plan 02-10)

**Scope:**

| Task | Files | Notes |
|------|-------|-------|
| Pass status from edit load to page | `events/[id]/edit/+page.svelte` | `data.status` → `readonly`, `eventStatus` props |
| Add readonly prop to EventStep | `EventStep.svelte` | `<fieldset disabled={readonly}>` |
| Pass eventStatus to PublishStep | `events/[id]/edit/+page.svelte` | Replace `bind:options` with `eventStatus` |
| Update events list edit links | `events/+page.svelte` | Show "Modifier" link for ready/started; keep "Reprendre" for draft |

**Verification:** Starting events show readonly EventStep; ready/started events show edit links in list.

### Wave 3: Breadcrumb + PublishStep cleanup (Plan 02-11)

**Scope:**

| Task | Files | Notes |
|------|-------|-------|
| Add onStepClick to Breadcrumb | `Breadcrumb.svelte` | Wrap step items in `<button>` |
| Wire breadcrumb in both wizard pages | `events/new/+page.svelte`, `events/[id]/edit/+page.svelte` | Pass `onStepClick` |
| Remove checkboxes from PublishStep | `PublishStep.svelte` | Remove options prop, Checkbox import, options Card |
| Replace options with eventStatus | `PublishStep.svelte` | Add `eventStatus` prop; condition Publish button |
| Clean up wizard pages | Both wizard pages | Remove publishOptions state, bind:options |

**Verification:** Breadcrumb steps are clickable; PublishStep shows no checkboxes; Publish button absent for non-draft.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `phases JSONB` in tournament table | Dedicated `phase` table | Decision: 2026-03-02 | Normalized schema; enables Phase 4 to query phases without JSONB parsing; cleaner indexing |
| Edit only draft events | Edit draft + ready + started | Decision: 2026-03-02 | Organizers can adjust published events; only finished is locked |
| Static (non-clickable) breadcrumb | Clickable breadcrumb, free navigation | Decision: 2026-03-02 | Better UX — no forced sequential navigation |
| Publish checkboxes in PublishStep | No checkboxes — direct publish | Decision: 2026-03-02 | Simpler UX; registration controlled by `registration_opens_at` date field |

---

## Open Questions

1. **Should save and publish share a persistence helper function?**
   - What we know: Both endpoints contain nearly identical tournament + phase insertion logic (4 code paths: save INSERT, save UPDATE, publish INSERT, publish UPDATE).
   - What's unclear: Whether a shared `$lib/server/event-persistence.ts` is worth the extraction cost for a 3-plan sprint.
   - Recommendation: Extract a `saveTournamentsWithPhases(tx, eventId, tournaments)` function. Reduces risk of partial updates and ensures consistent behavior across both endpoints. Place in `packages/front/src/lib/server/event-persistence.ts`.

2. **Flowbite-Svelte Datepicker + fieldset disabled**
   - What we know: `<fieldset disabled>` disables standard HTML inputs. Flowbite-Svelte's `<Datepicker>` is a custom component that may render its own `<input>` outside the fieldset's attribute propagation.
   - What's unclear: Whether Datepicker responds to fieldset disabled.
   - Recommendation: Attempt `<fieldset disabled>` first. If Datepicker remains interactive, add `disabled={readonly}` as a direct prop on each `<Datepicker>` component. Verify in browser before closing the plan.

3. **GroupPhase.qualifiers JSONB key verification before migration**
   - What we know: TypeScript uses `qualifiers` for GroupPhase (per-group count). `JSON.stringify` preserves camelCase keys in JSONB.
   - What's unclear: Whether any existing phase data has unexpected key names.
   - Recommendation: Before applying migration, run `SELECT phases FROM tournament LIMIT 1` in dev DB to confirm actual JSONB keys match `playersPerGroup` and `qualifiers` (not `players_per_group` or `qualifiers_per_group`).

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — all files listed in "Current Implementation State" table read directly
- `.planning/phases/02-wizard-persistence/02-CONTEXT.md` — authoritative user decisions document (revised 2026-03-02)
- `.planning/phases/02-wizard-persistence/02-VERIFICATION.md` — confirmed implementation state (18/18 truths)
- `.planning/STATE.md` — accumulated project decisions including postgres.js TxSql cast pattern

### Secondary (MEDIUM confidence)
- HTML specification — `<fieldset disabled>` propagates to descendant form controls — standard behavior, well-established
- PostgreSQL documentation — `jsonb_array_elements WITH ORDINALITY` — available since PostgreSQL 9.4; confirmed standard SQL feature

### Tertiary (LOW confidence)
- Flowbite-Svelte Datepicker response to `fieldset disabled` — not verified against component source; flagged as open question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries, no new dependencies
- Schema migration: HIGH — SQL patterns are well-known; schema derived directly from existing types.ts; JSONB key names confirmed by examining save endpoint (JSON.stringify preserves TS field names)
- Architecture: HIGH — follows all established project patterns exactly; derived from existing working code
- Pitfalls: HIGH — drawn from actual UAT failures, STATE.md decisions, and code inspection

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days — stable domain, no fast-moving dependencies)
