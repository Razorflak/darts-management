# Phase 2: Wizard Persistence - Research

**Researched:** 2026-03-01
**Domain:** SvelteKit form actions, postgres.js transactions, SQL schema design for multi-level nested data
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Navigation & URLs
- Le wizard migre sous le groupe `(app)` : route `(app)/events/new`
- La liste des événements : `(app)/events`
- La navbar reçoit un lien "Événements" pointant vers `/events`
- Après "Publier" : redirection vers `/events` (liste des événements)
- Après "Enregistrer" : redirection vers `/events` également (ou reste sur le wizard — Claude choisit)
- L'ancienne route `/tournaments/new` est supprimée

#### Statuts de l'événement
Cycle : `draft` → `ready` → `started` → `finished`
- **`draft`** : événement sauvegardé mais non visible — seul l'organisateur peut le voir
- **`ready`** : événement publié, visible pour les inscriptions si `registration_opens_at` est dépassée (ou nulle)
- **`started`** : tournoi lancé (Phase 4) — configuration verrouillée
- **`finished`** : tournoi terminé (Phase 5/6)

#### Champ `registration_opens_at`
- Champ date optionnel sur l'événement (pas sur les tournois individuels)
- Nom de colonne SQL : `registration_opens_at`
- Logique : statut `ready` ET (`registration_opens_at IS NULL` OU `today >= registration_opens_at`)
- Pas de job automatique — visibilité calculée à la lecture

#### Bouton "Enregistrer" (brouillon)
- Présent à chaque step du wizard
- Sauvegarde en `draft` — validation minimale (nom requis)
- Validation complète uniquement au clic "Publier"

#### Bouton "Publier"
- Uniquement sur le PublishStep (step 3)
- Validation complète côté serveur avant passage à `ready`
- En cas d'erreur serveur : message inline dans le PublishStep

#### Validation
- Validation uniquement à la soumission finale ("Publier")
- Navigation libre entre les steps
- "Enregistrer" : validation minimale — nom requis

#### Liste des événements (`/events`)
- Affichage en cards
- Infos : nom, dates, lieu, entité organisatrice, statut, nombre de tournois
- Scope : événements où l'utilisateur est organisateur ou admin
- Tri : par date de début décroissante
- Drafts visibles uniquement par leur créateur

#### Entité organisatrice
- Sélecteur populé depuis `getUserRoles` : entités où l'utilisateur a un rôle `organisateur`, `adminClub`, `adminComite`, `adminLigue`, ou `adminFederal`
- Valeur stockée : UUID de l'entité

### Claude's Discretion
- Structure exacte des tables SQL `event` et `tournament` (à dériver des types TypeScript existants)
- Sérialisation des phases de tournoi (colonne JSON ou table relationnelle — privilégier la simplicité pour v1)
- UX exacte du bouton "Enregistrer" dans le wizard (position, libellé, comportement si aucun nom saisi)
- Gestion des erreurs réseau

### Deferred Ideas (OUT OF SCOPE)
- Cache localStorage pour reprendre l'édition en cours de session
- Modification d'un événement existant post-publication
- Duplication d'événement
- Filtres / recherche dans la liste des événements
- Job automatique pour déclencher l'ouverture des inscriptions à la date prévue
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVENT-01 | L'organisateur peut créer un événement (nom, dates, lieu, entité organisatrice) et le persister | SQL schema for `event` table; SvelteKit +server.ts JSON action; postgres.js transaction |
| EVENT-02 | L'organisateur peut configurer plusieurs tournois dans un même événement (un par catégorie) | `tournament` table with `event_id` FK; phases stored as JSONB column |
| EVENT-03 | L'organisateur peut configurer les phases (4 types) avec groupes nommés | Phases stored as JSONB column on tournament — matches existing Phase type exactly |
| EVENT-04 | L'organisateur peut utiliser un template de création rapide | Templates already client-side in templates.ts; no server changes needed |
| EVENT-05 | L'organisateur peut prévisualiser et publier l'événement (statut "ouvert aux inscriptions") | Status enum `draft`→`ready`; `publish` named action validates then updates status |
| EVENT-06 | L'organisateur peut activer/désactiver l'assignation automatique des arbitres pour un tournoi | `auto_referee` boolean column on `tournament` table |
</phase_requirements>

---

## Summary

Phase 2 wires the existing wizard UI to real SvelteKit server routes backed by PostgreSQL. The wizard state is a rich nested object (`EventData` + `Tournament[]` where each tournament has `Phase[]`) — this is too deep for flat FormData. The correct approach is a `+server.ts` JSON endpoint (POST) for the save/publish action, bypassing the FormData-based form action system. The wizard calls `fetch()` with `JSON.stringify`, the server deserializes with `request.json()`, and redirects via `goto()` on the client.

The SQL schema decision (discretion area) is straightforward: an `event` table with a status enum, a `tournament` table with `event_id` FK and a `phases` JSONB column. Storing phases as JSONB is the correct v1 choice — the Phase type is stable, JSONB queries are not needed yet (Phase 4 will generate matches from it), and a relational schema for phases would add 3+ join tables with no current benefit.

postgres.js supports `sql.begin(async (tx) => { ... })` for atomic multi-table writes. The entire save (INSERT event + N INSERTs for tournaments) runs in one transaction.

**Primary recommendation:** Use `+server.ts` JSON endpoints for wizard save/publish, postgres.js transactions for atomic writes, and JSONB for phase storage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | current (project) | Routing, server actions, SSR | Already in use — project foundation |
| postgres.js | current (project) | Raw SQL, transactions via `sql.begin()` | Already in use via `packages/db` |
| Flowbite-Svelte | v1.x | UI components (Card, Badge, Button) | Already in use — project convention |
| node-pg-migrate | current (project) | SQL migrations | Already in use — migrations 001–005 exist |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `$app/navigation` (goto) | SvelteKit built-in | Client-side redirect after fetch POST | After save/publish succeeds |
| `$app/forms` (enhance) | SvelteKit built-in | Progressive enhancement for standard forms | Auth forms only — not wizard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB phases column | Relational `phase` table | Relational is better for Phase 4+ queries but adds 3 join tables now; JSONB is correct for v1 |
| `+server.ts` JSON endpoint | Form action with hidden JSON input | Hidden input + FormData works but is a workaround; fetch + JSON is cleaner for nested state |
| Named actions (`save`, `publish`) in `+server.ts` | Single default action | `+server.ts` does not support named actions — use separate endpoints or query param |

**Installation:** No new packages needed — all required libraries are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/
  db/src/schema/
    006_event.sql          # event table + status enum
    007_tournament.sql     # tournament table with phases JSONB + auto_referee

packages/front/src/routes/
  (app)/
    events/
      +page.server.ts      # load: list events for user
      +page.svelte         # /events — event cards list
      new/
        +page.server.ts    # load: user's organisable entities
        +page.svelte       # wizard UI (migrated from /tournaments/new)
        save/
          +server.ts       # POST JSON → save draft
        publish/
          +server.ts       # POST JSON → validate + publish
    +layout.svelte         # add "Événements" nav link
  tournaments/
    new/
      +page.svelte         # DELETE this file
```

### Pattern 1: JSON POST to +server.ts

**What:** The wizard submits nested state as JSON to a `+server.ts` endpoint via `fetch()`.
**When to use:** Whenever wizard state needs to persist — both "Enregistrer" (draft) and "Publier".
**Why not form action:** Form actions use FormData which is flat; nested Phase[] arrays cannot be serialized without a hidden-input hack. `+server.ts` with `request.json()` is the clean solution.

```typescript
// packages/front/src/routes/(app)/events/new/save/+server.ts
import { json, error } from '@sveltejs/kit'
import { sql } from '$lib/server/db'
import { getUserRoles } from '$lib/server/authz'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Non authentifié')

  const body = await request.json()
  // Validate: name required for draft
  if (!body.event?.name?.trim()) {
    return json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  // Verify user has a role on the selected entity
  const roles = await getUserRoles(locals.user.id)
  const hasRole = roles.some(
    (r) => r.entityId === body.event.entity &&
      ['organisateur', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal'].includes(r.role)
  )
  if (!hasRole) return json({ error: 'Accès refusé.' }, { status: 403 })

  await sql.begin(async (tx) => {
    const [event] = await tx`
      INSERT INTO event (name, entity_id, starts_at, ends_at, location, status, organizer_id)
      VALUES (
        ${body.event.name}, ${body.event.entity},
        ${body.event.startDate}, ${body.event.endDate},
        ${body.event.location}, 'draft', ${locals.user!.id}
      )
      RETURNING id
    `
    for (const t of body.tournaments) {
      await tx`
        INSERT INTO tournament (event_id, name, category, quota, start_time, phases, auto_referee)
        VALUES (
          ${event.id}, ${t.name}, ${t.category}, ${t.quota},
          ${t.startTime}, ${JSON.stringify(t.phases)}, ${t.autoReferee ?? false}
        )
      `
    }
  })

  return json({ ok: true })
}
```

```typescript
// Client side in +page.svelte (wizard)
async function save() {
  saving = true
  const res = await fetch('/events/new/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event, tournaments })
  })
  saving = false
  if (res.ok) goto('/events')
  else {
    const data = await res.json()
    saveError = data.error ?? 'Erreur lors de la sauvegarde.'
  }
}
```

### Pattern 2: postgres.js Transaction for Atomic Writes

**What:** `sql.begin(async (tx) => { ... })` wraps all INSERTs in one transaction.
**When to use:** Every save/publish — event + tournaments must commit together or not at all.

```typescript
// Source: postgres.js README — sql.begin()
await sql.begin(async (tx) => {
  const [{ id: eventId }] = await tx`INSERT INTO event (...) RETURNING id`
  for (const t of tournaments) {
    await tx`INSERT INTO tournament (event_id, ...) VALUES (${eventId}, ...)`
  }
  // Automatically COMMITs on success, ROLLBACKs on any thrown error
})
```

### Pattern 3: Load Function for Entity Selector

**What:** The `load` function for `/events/new` fetches the user's organisable entities.
**When to use:** Page load — populates the entity selector in EventStep.

```typescript
// packages/front/src/routes/(app)/events/new/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/login')

  const roles = await getUserRoles(locals.user.id)
  const organisableRoles = ['organisateur', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal']
  const entityIds = roles
    .filter(r => organisableRoles.includes(r.role))
    .map(r => r.entityId)

  if (entityIds.length === 0) return { entities: [] }

  const entities = await sql<{ id: string; name: string; type: string }[]>`
    SELECT id, name, type FROM entity
    WHERE id = ANY(${entityIds})
    ORDER BY name
  `
  return { entities }
}
```

### Pattern 4: Events List Query

**What:** Load all events scoped to user (as organizer or admin).
**When to use:** `/events` page load.

```typescript
// packages/front/src/routes/(app)/events/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/login')

  const roles = await getUserRoles(locals.user.id)
  const entityIds = roles.map(r => r.entityId)

  const events = await sql`
    SELECT
      e.id, e.name, e.status, e.starts_at, e.ends_at, e.location,
      en.name AS entity_name,
      COUNT(t.id)::int AS tournament_count
    FROM event e
    JOIN entity en ON en.id = e.entity_id
    LEFT JOIN tournament t ON t.event_id = e.id
    WHERE
      e.organizer_id = ${locals.user.id}
      OR (e.entity_id = ANY(${entityIds}) AND e.status != 'draft')
    GROUP BY e.id, en.name
    ORDER BY e.starts_at DESC
  `
  return { events }
}
```

### Anti-Patterns to Avoid

- **Flat FormData for nested wizard state:** Serializing Tournament[] with phases into FormData fields requires a naming convention scheme (`tournaments[0][phases][1][type]`) — brittle and hard to validate. Use `fetch` + JSON instead.
- **Storing phases in a relational table for v1:** Adds 3+ tables (phase, bracket_tier, group_phase) with no query benefit until Phase 4. Use JSONB.
- **Checking authz only in load, not in POST handler:** A user can POST directly to the endpoint without visiting the page. Always re-check `getUserRoles` in the server handler.
- **Omitting the `organizer_id` column:** Without it, the draft visibility rule (draft visible only to creator) requires a join to check entity membership. Store organizer_id directly.
- **Using `use:enhance` on wizard submit:** `use:enhance` requires a `<form method="POST">` pointing to a SvelteKit page action. The wizard uses `fetch()` + `goto()` — do not add a `<form>` wrapper around the entire wizard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table insert | Manual BEGIN/COMMIT SQL strings | `sql.begin(async tx => { ... })` | postgres.js handles rollback on error automatically |
| JSONB storage of phases | Custom serialization format | `JSON.stringify(phases)` passed to SQL | PostgreSQL JSONB handles validation, indexing, and querying natively |
| Entity hierarchy traversal | Recursive CTE queries | `getUserRoles` already returns flat `{entityId, role}[]` — filter by role | The authz module is already built |
| Auth guard | Custom middleware | `locals.user` check + `redirect(302, '/login')` | Already established pattern — see `+layout.server.ts` |

**Key insight:** The postgres.js `sql.begin()` API is the safe, idiomatic pattern. Never issue manual `BEGIN`/`COMMIT` strings — they interact badly with connection pooling.

---

## Common Pitfalls

### Pitfall 1: EventData.entity stores label, not UUID

**What goes wrong:** The existing `EventData.entity` field in `types.ts` is typed as `string` and the mock entities in `EventStep.svelte` use plain strings like `'Mon Comité'`. When wired to real data, `entity` must store the UUID — but if the UI is not updated, it will still pass the label.

**Why it happens:** The prototype used label strings; the real system needs UUIDs as FK to `entity.id`.

**How to avoid:** In the load function, return `{ id, name }` pairs. In `EventStep.svelte`, update the Select option `value` to be `entity.id` (not `entity.name`). The `EventData.entity` field semantically stores the entity UUID in production.

**Warning signs:** `INSERT INTO event ... entity_id = 'Mon Comité'` — UUID constraint violation at runtime.

### Pitfall 2: `sql.begin()` and error handling in POST handler

**What goes wrong:** If `sql.begin()` throws (e.g., constraint violation), the error propagates as an unhandled Promise rejection or returns a 500 with no useful message to the client.

**Why it happens:** Forgot to wrap `sql.begin()` in try/catch in the `+server.ts` handler.

**How to avoid:**
```typescript
try {
  await sql.begin(async (tx) => { /* ... */ })
  return json({ ok: true })
} catch (err) {
  const message = err instanceof Error ? err.message : 'Erreur base de données.'
  return json({ error: message }, { status: 500 })
}
```

### Pitfall 3: Duplicate save calls

**What goes wrong:** User clicks "Enregistrer" multiple times quickly → multiple rows in `event` table with the same data.

**Why it happens:** No event ID tracking — each save creates a new event.

**How to avoid:** For v1 (creation only), the save endpoint always creates a new event and returns the new `event.id`. The wizard page stores this ID in local state. If an ID already exists, subsequent saves should UPDATE not INSERT. Alternatively, disable the button while `saving = true`.

**Note:** The CONTEXT.md defers "edit existing event" to a later phase, but the wizard must at least not double-create on multiple clicks. The `saving` flag approach (disable button) is sufficient for v1.

### Pitfall 4: JSONB phases not validated at SQL level

**What goes wrong:** Invalid phase objects (missing `type`, wrong field names) are stored silently as JSONB with no constraint.

**Why it happens:** JSONB accepts any JSON — no schema validation unless you add a CHECK constraint.

**How to avoid:** Validate the phase array shape in the server action before INSERT. TypeScript type guards (`isGroupPhase`, `isEliminationPhase` — already exist in PublishStep.svelte) can be reused in a server-side validation function. For v1, a simple array-length > 0 check may be acceptable.

### Pitfall 5: Registration opens at NULL vs. explicit date

**What goes wrong:** `registration_opens_at` is a new field not in the current `EventData` type. If the type is not extended and the UI field is not added, publication silently defaults to NULL (immediate open on publish), which may not be the user's intent.

**Why it happens:** CONTEXT.md adds `registration_opens_at` as a new field to EventStep — but the existing `EventData` type and component don't have it.

**How to avoid:** Add `registrationOpensAt?: string` to `EventData` type AND add the UI field in `EventStep.svelte` as a Datepicker next to the event dates. The server side maps it to `registration_opens_at` in the SQL INSERT.

### Pitfall 6: Draft visibility leaks

**What goes wrong:** The `/events` list query returns draft events belonging to other users if the entity_id filter is too broad.

**Why it happens:** A query like `WHERE entity_id = ANY(${entityIds})` without the `draft` filter shows all drafts for the entity.

**How to avoid:** The correct query: `WHERE (organizer_id = ${userId}) OR (entity_id = ANY(${entityIds}) AND status != 'draft')`. Drafts visible ONLY to their creator.

---

## Code Examples

### SQL Migration: event table

```sql
-- packages/db/src/schema/006_event.sql
CREATE TYPE event_status AS ENUM ('draft', 'ready', 'started', 'finished');

CREATE TABLE event (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  entity_id             UUID NOT NULL REFERENCES entity(id) ON DELETE RESTRICT,
  organizer_id          TEXT NOT NULL,  -- references Better Auth user.id (TEXT)
  starts_at             DATE NOT NULL,
  ends_at               DATE NOT NULL,
  location              TEXT NOT NULL DEFAULT '',
  registration_opens_at DATE,           -- NULL = open immediately on publish
  status                event_status NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_organizer_idx ON event(organizer_id);
CREATE INDEX event_entity_idx ON event(entity_id);
CREATE INDEX event_status_idx ON event(status);
CREATE INDEX event_starts_at_idx ON event(starts_at DESC);
```

### SQL Migration: tournament table

```sql
-- packages/db/src/schema/007_tournament.sql
CREATE TABLE tournament (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  category      TEXT,                  -- matches Category type: 'male' | 'female' | ...
  quota         INTEGER NOT NULL DEFAULT 32,
  start_time    TEXT NOT NULL DEFAULT '',   -- 'HH:MM' string, matches existing type
  start_date    DATE,                  -- NULL = same as event.starts_at
  auto_referee  BOOLEAN NOT NULL DEFAULT false,  -- EVENT-06
  phases        JSONB NOT NULL DEFAULT '[]',     -- Phase[] serialized
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tournament_event_idx ON tournament(event_id);
```

### TypeScript: EventData type extension

```typescript
// Extend EventData in packages/front/src/lib/tournament/types.ts
// Add registrationOpensAt as optional field
export interface EventData {
  name: string
  entity: string           // UUID of entity (stored as label in prototype — must switch to UUID)
  startDate: string
  startTime: string
  endDate: string
  location: string
  registrationOpensAt?: string  // NEW — maps to registration_opens_at SQL column
}
```

### TypeScript: Publish validation server-side

```typescript
// Minimal publish validation in +server.ts
function validateForPublish(body: { event: EventData; tournaments: Tournament[] }): string | null {
  if (!body.event.name?.trim()) return 'Le nom de l\'événement est requis.'
  if (!body.event.entity) return 'L\'entité organisatrice est requise.'
  if (!body.event.startDate) return 'La date de début est requise.'
  if (!body.event.endDate) return 'La date de fin est requise.'
  if (body.tournaments.length === 0) return 'Au moins un tournoi est requis.'
  for (const t of body.tournaments) {
    if (!t.name?.trim()) return 'Chaque tournoi doit avoir un nom.'
    if (!t.category) return `Le tournoi "${t.name}" n'a pas de catégorie.`
  }
  return null  // valid
}
```

### EventStep: entity selector from server data

```svelte
<!-- EventStep receives entities as a prop from page data (not hardcoded) -->
<script lang="ts">
  interface Props {
    event: EventData
    entities: { id: string; name: string; type: string }[]
    onNext: () => void
    onCancel: () => void
  }
  let { event = $bindable(), entities, onNext, onCancel }: Props = $props()
</script>

<Select id="event-entity" bind:value={event.entity} required>
  <option value="" disabled>Sélectionner une entité</option>
  {#each entities as entity}
    <option value={entity.id}>{entity.name}</option>
  {/each}
</Select>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wizard posts to `/tournaments/new` prototype with `goto('/')` | Wizard posts to `/events/new/save` and `/events/new/publish` via `fetch` JSON | Phase 2 | Real persistence — events survive page reload |
| Hardcoded entity list `['Mon Comité', 'Ma Ligue', 'FFD']` | `getUserRoles()` → dynamic entity list from DB | Phase 2 | Only authorized entities shown |
| `EventData.entity` stores display label | `EventData.entity` stores UUID | Phase 2 | FK integrity — entity_id is a UUID in SQL |

---

## Open Questions

~~1. **Save → Update vs. always Insert**~~
**RESOLVED (2026-03-01):** Si l'événement existe déjà (eventId connu du wizard), la sauvegarde doit UPDATE — pas créer un second brouillon. Le save endpoint renvoie l'`event.id` lors de la création ; le wizard stocke cet ID en state local. Les sauvegardes suivantes envoient l'ID et le serveur fait un UPDATE conditionnel.

~~2. **`Tournament.club` field**~~
**RESOLVED (2026-03-01):** `club` n'est PAS une FK vers la table `entity`. C'est un champ texte optionnel libre, associé à l'événement (pas au niveau entité fédérale). Colonne `club TEXT` sur `tournament`, nullable, aucune contrainte FK.

3. **`auto_referee` default in wizard UI**
   - What we know: EVENT-06 requires toggling auto-referee assignment per tournament; the field is `auto_referee` boolean
   - What's unclear: Should the toggle be in TournamentForm (existing component, no changes per CONTEXT) or a new step?
   - Recommendation: Since CONTEXT says wizard components are NOT modified, add `autoReferee` to `Tournament` type and expose as a checkbox in `TournamentForm.svelte` alongside existing fields. This is the minimal change consistent with "câbler le backend sans refactorer l'UI existante."

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `packages/front/src/routes/`, `packages/db/src/schema/`, `packages/front/src/lib/tournament/` — all files read directly
- `packages/front/src/routes/(auth)/login/+page.svelte` — confirmed `use:enhance` pattern in use
- `packages/front/src/routes/(app)/admin/entities/new/+page.server.ts` — confirmed existing form action + raw SQL pattern
- `packages/db/src/authz.ts` — confirmed `getUserRoles()` API returns `{ entityId: string; role: EntityRole }[]`

### Secondary (MEDIUM confidence)
- [SvelteKit Form Actions Docs](https://svelte.dev/docs/kit/form-actions) — confirmed `request.json()` is available in actions/endpoints; confirmed `use:enhance` requires SvelteKit page actions (not `+server.ts`)
- [postgres.js README](https://github.com/porsager/postgres/blob/master/README.md) — confirmed `sql.begin(async tx => { ... })` transaction API with automatic COMMIT/ROLLBACK

### Tertiary (LOW confidence)
- WebSearch results on SvelteKit JSON endpoint patterns — consistent with official docs; not flagged as uncertain

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; confirmed via codebase inspection
- Architecture: HIGH — patterns derived from existing working code (01-04 form actions, 01-05 authz)
- SQL schema: HIGH — derived directly from existing TypeScript types; confirmed naming conventions from existing migrations
- Pitfalls: HIGH — derived from actual code inspection (entity UUID vs label issue is a real gap in the prototype)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable stack)
