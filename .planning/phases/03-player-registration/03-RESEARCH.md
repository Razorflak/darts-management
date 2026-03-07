# Phase 3: Player Registration - Research

**Researched:** 2026-03-07
**Domain:** SvelteKit full-stack — DB schema design, role-based registration, player autocomplete, check-in management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modèle joueur (entité Player)**
- Un profil joueur est créé automatiquement à la création d'un compte utilisateur (lié 1-1 au compte)
- Un profil joueur peut exister sans compte (créé par un admin ou gestionnaire pour un joueur non-inscrit sur la plateforme)
- Champs minimaux du profil joueur : prénom, nom, date de naissance, numéro de licence (optionnel) — pas d'affiliation obligatoire (joueur peut être non-licencié)
- Un profil joueur créé sans compte est réutilisable pour les tournois suivants (il persiste en DB)

**Qui peut inscrire un joueur**
- Un joueur connecté peut s'auto-inscrire (son profil lié à son compte)
- Un admin tournoi peut inscrire n'importe quel joueur (recherche dans tous les profils existants, ou création d'un nouveau profil)
- Un gestionnaire d'entité sous l'entité organisatrice (ex : club appartenant au comité organisateur) peut inscrire ses joueurs — même mécanique que l'admin
- La recherche de joueurs existants est globale (tous les profils en DB, pas de restriction par entité)
- Si un joueur n'existe pas en DB, la saisie crée un nouveau profil joueur réutilisable

**Inscription multiple**
- Un joueur peut être inscrit à plusieurs tournois du même événement sans restriction (phase 3 — les règles métier viendront plus tard)

**Validation des inscriptions**
- Toutes les inscriptions (self-service et admin/gestionnaire) sont validées immédiatement, sans workflow d'approbation

**UX auto-inscription (joueur)**
- Les tournois ouverts sont accessibles depuis deux endroits :
  1. La page publique de l'événement : `/events/[id]` — liste les tournois de l'événement avec bouton "S'inscrire"
  2. Le dashboard joueur — section "Tournois disponibles" : cards d'événements avec leurs tournois et boutons d'inscription
- Tous les événements ouverts sont visibles dans le dashboard (pas de restriction par entité)
- Confirmation d'inscription : immédiate, pas d'email — le bouton "S'inscrire" devient "Inscrit"
- Un joueur peut se désinscrire lui-même jusqu'au lancement du tournoi
- Un visiteur non connecté qui clique "S'inscrire" est redirigé vers le login avec retour URL préservé

**Routes**
- `/events/[id]` — page publique : infos événement + liste des tournois + bouton S'inscrire par tournoi
- `/tournaments/[id]` — page publique : liste des joueurs inscrits (classements et brackets ajoutés en phase 6)
- `/tournaments/[id]/admin` — gestion admin : roster, check-in, actions

**Interface roster & check-in (admin)**
- Roster accessible depuis `/tournaments/[id]/admin`
- Chaque ligne de joueur expose deux boutons contextuels : **"Check-in"** (si non checké) ou **"Retirer"** (supprimer l'inscription) + lien vers le profil joueur
- Bulk check-in : bouton "Tout checker" pour marquer tous les inscrits comme présents d'un coup
- Le check-in est intégré dans la vue roster (pas de vue séparée)
- Si le check-in est **désactivé** pour un tournoi : la colonne Présent est cachée (tous les inscrits comptent comme présents pour le lancement)

**Contraintes & clôture**
- Pas de limite de joueurs par tournoi en phase 3
- L'inscription se ferme automatiquement au lancement du tournoi (phase 4)
- La configuration du tournoi (phases, format) reste éditable jusqu'au lancement

### Claude's Discretion
- Design de la page publique `/events/[id]` et des cards événements dans le dashboard
- UX de la recherche de joueurs (autocomplétion, debounce, affichage des résultats)
- Comportement exact du bulk check-in (confirmation avant action ?)
- Gestion des erreurs (inscription échouée, doublon, etc.)

### Deferred Ideas (OUT OF SCOPE)
- **Fusion profil joueur / compte utilisateur** : un joueur créé sans compte pourra plus tard réclamer son profil — hors scope phase 3
- **Recherche rapide + filtre par entité** dans la section "Tournois disponibles" du dashboard
- **Tri des événements par proximité géographique**
- **Capacité max de joueurs par tournoi** (liste d'attente)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAYER-01 | Un joueur peut s'inscrire à un tournoi | Self-registration via `/events/[id]` public page and player dashboard; SvelteKit form actions + immediate DB INSERT into `tournament_registration` |
| PLAYER-02 | L'admin tournoi peut inscrire manuellement un joueur | Admin interface at `/tournaments/[id]/admin`; player search autocomplete endpoint + new-player creation in same transaction |
| PLAYER-03 | L'admin tournoi peut effectuer le check-in des joueurs présents le jour J | Roster table with per-row check-in button + bulk "Tout checker"; UPDATE `checked_in = true` on `tournament_registration` |
| PLAYER-04 | Le check-in est configurable par tournoi (optionnel ou obligatoire avant lancement) | `check_in_required` boolean on `tournament` table; UI hides/shows Présent column accordingly |
</phase_requirements>

---

## Summary

Phase 3 introduces three new DB entities — `player` (profil joueur), `tournament_registration` (inscription), and a `check_in_required` flag on `tournament` — plus three new route surfaces: `/events/[id]` (public page), `/tournaments/[id]` (public roster), and `/tournaments/[id]/admin` (admin roster + check-in). The architecture is a direct extension of the patterns established in phases 1 and 2: raw SQL via postgres.js, Zod-validated results, SvelteKit `+page.server.ts` loads + `+server.ts` API endpoints, Flowbite-Svelte components, and the project's existing authz module.

The most important design decision is the `player` table structure: `user_id TEXT NULL` references the Better Auth `user` table (no FK constraint to avoid cross-schema issues, matching the `organizer_id` pattern from `event`). A `player` row is created atomically in a `hooks.server.ts` trigger-equivalent on first login, or manually by an admin. Player search for admin enrollment uses a dedicated `GET /tournaments/[id]/admin/players/search?q=` endpoint returning JSON — this is the standard SvelteKit pattern for autocomplete without a form action.

The player dashboard section ("Tournois disponibles") and the public `/events/[id]` page both require a SQL query joining `event → tournament → tournament_registration` to compute per-tournament registration state for the current user. The redirect-to-login-with-return-URL pattern already exists in the codebase (`redirect(302, '/login')`) but needs enhancement to preserve the `?redirectTo=` parameter, which is a known SvelteKit pattern.

**Primary recommendation:** Build new DB migrations first (player + tournament_registration tables + check_in_required column), then route by route: public event page → player dashboard section → admin roster page → player search endpoint. Each route is independent and can be implemented sequentially.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50.2 | Routing, load functions, form actions, API endpoints | Project foundation |
| Svelte | ^5.51.0 | UI components with runes | Project foundation |
| postgres.js | ^3.4.8 | Raw SQL driver | Established pattern — no ORM |
| zod | ^4.3.6 | Schema validation for SQL results | Project-mandated (Zod-first rule) |
| flowbite-svelte | ^1.31.0 | UI components (Table, Button, Badge, Modal, Input) | Project standard |
| better-auth | ^1.4.20 | Session/auth | Phase 1 decision |

### No new dependencies required

All necessary libraries are already installed. This phase is pure application logic — DB migrations + routes + Svelte components.

---

## Architecture Patterns

### New DB Tables (Migrations 011, 012)

**Migration 011 — player table:**
```sql
CREATE TABLE player (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,                          -- NULL if created by admin; no FK (same pattern as organizer_id in event)
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  birth_date  DATE NOT NULL,
  licence_no  TEXT,                          -- optional
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX player_user_idx ON player(user_id);
CREATE INDEX player_name_idx ON player(last_name, first_name);
```

**Migration 012 — tournament_registration + check_in_required:**
```sql
ALTER TABLE tournament ADD COLUMN check_in_required BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE tournament_registration (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES player(id) ON DELETE RESTRICT,
  checked_in    BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tournament_id, player_id)
);

CREATE INDEX reg_tournament_idx ON tournament_registration(tournament_id);
CREATE INDEX reg_player_idx ON tournament_registration(player_id);
```

The `UNIQUE (tournament_id, player_id)` constraint prevents duplicate registrations at the DB level — no application-level deduplication needed.

### Recommended Route Structure

```
packages/front/src/routes/
├── (auth)/                          # existing
├── (app)/
│   ├── events/
│   │   ├── [id]/
│   │   │   └── +page.server.ts      # public event page (load)
│   │   │   └── +page.svelte         # public event page (UI)
│   │   │   └── register/
│   │   │       └── +server.ts       # POST — self-register to tournament
│   │   │       └── +server.ts       # DELETE — self-unregister
│   └── ...
├── tournaments/                     # NEW top-level segment
│   └── [id]/
│       ├── +page.server.ts          # public roster (load)
│       ├── +page.svelte             # public roster (UI)
│       └── admin/
│           ├── +page.server.ts      # admin roster + check-in (load)
│           ├── +page.svelte         # admin roster + check-in (UI)
│           ├── register/
│           │   └── +server.ts       # POST — admin register player (existing or new)
│           ├── unregister/
│           │   └── +server.ts       # DELETE — admin remove player
│           ├── checkin/
│           │   └── +server.ts       # POST — check-in single player
│           └── checkin-all/
│               └── +server.ts       # POST — bulk check-in
```

Note: `/events/[id]` already exists as a route segment directory (only `edit` sub-route exists). The `+page.server.ts` and `+page.svelte` for the public event page are new files in an existing directory.

### Pattern 1: Player Auto-Creation on Login

A player profile must be created automatically when a user account is created. The cleanest approach in this SvelteKit/Better Auth setup is to create the player row in the registration action (Better Auth handles user creation, then the app creates the player):

Better Auth does not have a built-in "on user created" hook in this configuration. The pattern is: check for player existence in `hooks.server.ts` after session validation, create atomically if missing.

```typescript
// hooks.server.ts addition — after auth.api.getSession()
if (locals.user && !locals.player) {
  const existing = await sql<Record<string, unknown>[]>`
    SELECT id FROM player WHERE user_id = ${locals.user.id} LIMIT 1
  `
  if (existing.length === 0) {
    // Parse user.name as "Prénom Nom" (Better Auth stores full name in `name`)
    // This is a best-effort split; admin can correct via profile edit later
    const parts = locals.user.name.split(' ')
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ') || parts[0] ?? ''
    await sql`
      INSERT INTO player (user_id, first_name, last_name, birth_date)
      VALUES (${locals.user.id}, ${firstName}, ${lastName}, '1900-01-01')
      ON CONFLICT DO NOTHING
    `
  }
}
```

**Alternative (simpler for Phase 3):** Lazy creation — create the player row on first registration attempt instead of in hooks. This avoids hooks complexity and the name-split ambiguity. The planner should decide which approach to use based on whether the player profile dashboard section needs the player row to exist before registration.

Given the dashboard shows "Tournois disponibles" (open events), the player row must exist to JOIN against registrations. **Recommendation: create in hooks.server.ts with ON CONFLICT DO NOTHING guard** (idempotent).

### Pattern 2: Self-Registration API Endpoint

```typescript
// /events/[id]/register/+server.ts
import { json, error } from '@sveltejs/kit'
import { z } from 'zod'
import { sql } from '$lib/server/db'
import type { RequestHandler } from './$types'

const RegisterBodySchema = z.object({
  tournament_id: z.uuid()
})

export const POST: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user) error(401, 'Non authentifié')

  const body = RegisterBodySchema.parse(await request.json())

  // Fetch the player profile linked to this user
  const players = await sql<Record<string, unknown>[]>`
    SELECT id FROM player WHERE user_id = ${locals.user.id} LIMIT 1
  `
  if (players.length === 0) error(400, 'Profil joueur introuvable')
  const playerId = players[0].id as string

  // Verify tournament belongs to event and is open
  const tournaments = await sql<Record<string, unknown>[]>`
    SELECT t.id FROM tournament t
    JOIN event e ON e.id = t.event_id
    WHERE t.id = ${body.tournament_id}
      AND e.id = ${params.id}
      AND e.status = 'ready'
  `
  if (tournaments.length === 0) error(404, 'Tournoi introuvable ou fermé')

  try {
    await sql`
      INSERT INTO tournament_registration (tournament_id, player_id)
      VALUES (${body.tournament_id}, ${playerId})
    `
  } catch (e: unknown) {
    // Unique constraint violation = already registered
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505') {
      error(409, 'Déjà inscrit')
    }
    throw e
  }

  return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user) error(401, 'Non authentifié')

  const body = RegisterBodySchema.parse(await request.json())

  const players = await sql<Record<string, unknown>[]>`
    SELECT id FROM player WHERE user_id = ${locals.user.id} LIMIT 1
  `
  if (players.length === 0) error(400, 'Profil joueur introuvable')
  const playerId = players[0].id as string

  // Only allow unregister if tournament not yet started
  await sql`
    DELETE FROM tournament_registration r
    USING tournament t
    JOIN event e ON e.id = t.event_id
    WHERE r.tournament_id = ${body.tournament_id}
      AND r.player_id = ${playerId}
      AND t.id = ${body.tournament_id}
      AND e.status = 'ready'
  `

  return json({ ok: true })
}
```

### Pattern 3: Player Search Endpoint (Admin)

The admin player search must be a `GET +server.ts` to support autocomplete. Debounce is handled client-side (no library needed — plain `setTimeout`).

```typescript
// /tournaments/[id]/admin/players/search/+server.ts
import { json, error } from '@sveltejs/kit'
import { z } from 'zod'
import { sql } from '$lib/server/db'
import type { RequestHandler } from './$types'

const PlayerSearchResultSchema = z.object({
  id: z.uuid(),
  first_name: z.string(),
  last_name: z.string(),
  birth_date: z.string(),  // DATE as text
  licence_no: z.string().nullable()
})
type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) error(401)
  // Auth check: adminTournoi or gestionnaire — verify in calling page load

  const q = url.searchParams.get('q') ?? ''
  if (q.length < 2) return json([])

  const results = z.array(PlayerSearchResultSchema).parse(
    await sql<Record<string, unknown>[]>`
      SELECT id, first_name, last_name, birth_date::text, licence_no
      FROM player
      WHERE first_name ILIKE ${'%' + q + '%'}
         OR last_name  ILIKE ${'%' + q + '%'}
         OR licence_no ILIKE ${'%' + q + '%'}
      ORDER BY last_name, first_name
      LIMIT 10
    `
  )

  return json(results)
}
```

### Pattern 4: Redirect-to-Login with Return URL

The existing codebase uses `redirect(302, '/login')` without preserving the return URL. Phase 3 needs this for the "S'inscrire" button on the public event page.

```typescript
// In a public route load function (no auth layout wrapper)
if (!locals.user) {
  redirect(302, `/login?redirectTo=/events/${params.id}`)
}
```

```typescript
// In the login action (+page.server.ts)
const redirectTo = url.searchParams.get('redirectTo') ?? '/events'
throw redirect(302, redirectTo)
```

**Note:** The public `/events/[id]` page is NOT inside the `(app)` route group (which auto-redirects). It needs its own auth check that preserves the URL.

### Pattern 5: Zod Schemas for New Entities

All new types go into `event-schemas.ts` per project rules:

```typescript
// To add to packages/front/src/lib/server/schemas/event-schemas.ts

export const PlayerSchema = z.object({
  id: z.uuid(),
  user_id: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string(),
  birth_date: z.string(),  // DATE returned as text from postgres
  licence_no: z.string().nullable()
})
export type Player = z.infer<typeof PlayerSchema>

export const TournamentRegistrationSchema = z.object({
  id: z.uuid(),
  tournament_id: z.uuid(),
  player_id: z.uuid(),
  checked_in: z.boolean(),
  registered_at: z.coerce.date()
})
export type TournamentRegistration = z.infer<typeof TournamentRegistrationSchema>

// For the public event page — tournament with registration state
export const TournamentWithRegistrationSchema = TournamentSchema.extend({
  registration_count: z.number().int(),
  is_registered: z.boolean()  // true if current user's player is registered
})
export type TournamentWithRegistration = z.infer<typeof TournamentWithRegistrationSchema>

// For the roster view
export const RosterEntrySchema = z.object({
  registration_id: z.uuid(),
  player_id: z.uuid(),
  first_name: z.string(),
  last_name: z.string(),
  licence_no: z.string().nullable(),
  checked_in: z.boolean(),
  registered_at: z.coerce.date()
})
export type RosterEntry = z.infer<typeof RosterEntrySchema>
```

### Pattern 6: Admin Authorization Check

The admin roster page must verify `adminTournoi` or admin-level role for the tournament's event entity. Pattern from existing code:

```typescript
// /tournaments/[id]/admin/+page.server.ts
const roles = await getUserRoles(locals.user.id)
const tournament = /* fetch tournament with event entity_id */
const hasAccess = roles.some(r =>
  r.entityId === tournament.entity_id &&
  ['adminTournoi', 'adminClub', 'adminComite', 'adminLigue', 'adminFederal'].includes(r.role)
)
if (!hasAccess) error(403, 'Accès refusé')
```

### Recommended Project Structure (additions)

```
packages/
└── front/src/
    ├── lib/server/schemas/
    │   └── event-schemas.ts          # add Player, TournamentRegistration, RosterEntry schemas
    ├── routes/
    │   ├── (app)/
    │   │   └── events/[id]/          # existing dir — add +page.server.ts, +page.svelte
    │   │       └── register/
    │   │           └── +server.ts    # POST/DELETE self-register
    │   └── tournaments/              # NEW (outside (app) group for public access)
    │       └── [id]/
    │           ├── +page.server.ts   # public roster
    │           ├── +page.svelte
    │           └── admin/
    │               ├── +page.server.ts
    │               ├── +page.svelte
    │               ├── register/+server.ts
    │               ├── unregister/+server.ts
    │               ├── checkin/+server.ts
    │               ├── checkin-all/+server.ts
    │               └── players/
    │                   └── search/+server.ts
    └── packages/db/src/schema/
        ├── 011_player.sql
        └── 012_registration.sql
```

**Important routing decision:** `/tournaments/[id]` should be a top-level route, NOT inside `(app)`, because it's a public page. The `(app)` group's layout auto-redirects to login. The `admin` sub-route inside it IS protected (manual auth check in load function). Alternatively, `/tournaments/[id]` could live outside all route groups.

### Anti-Patterns to Avoid

- **Inline types:** Never write `type RosterEntry = { ... }` — always derive from Zod schema.
- **FK to Better Auth `user` table:** Do not add `FOREIGN KEY (user_id) REFERENCES "user"(id)` — matches the `organizer_id TEXT` pattern in `event`. Better Auth manages its own tables.
- **Checking auth only in layout:** Always check in the `+page.server.ts` load AND any `+server.ts` action — the (app) layout load only runs for that route group.
- **postgres.js sql<unknown[]>:** Use `sql<Record<string, unknown>[]>` — `unknown[]` is rejected by the driver's type constraint.
- **Empty array with ANY():** Before using `WHERE id = ANY(${arr})`, check `arr.length > 0` (established project pattern from events page).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate registration prevention | Application-level dedup check | `UNIQUE (tournament_id, player_id)` DB constraint + catch error code `23505` | DB constraint is atomic; application check has TOCTOU race |
| Autocomplete debounce | Custom event throttle library | Plain `setTimeout`/`clearTimeout` in Svelte `$effect` | No dependency needed; pattern is trivial |
| Player name search | Custom search engine | `ILIKE '%query%'` on `last_name, first_name, licence_no` | Sufficient for the dataset size; full-text search deferred |
| Bulk check-in transaction | Loop of individual updates | Single `UPDATE ... WHERE tournament_id = $1` | One round-trip, atomic |
| Admin role check | Re-implementing permission logic | `getUserRoles()` from `$lib/server/authz` | Already exists and tested |

**Key insight:** The DB unique constraint is the only reliable deduplication mechanism. All application-level checks are defensive, not authoritative.

---

## Common Pitfalls

### Pitfall 1: Public routes inside (app) route group

**What goes wrong:** Placing `/tournaments/[id]` inside `(app)/` causes the layout's `redirect(302, '/login')` to fire for unauthenticated visitors, making the public roster inaccessible.

**Why it happens:** The `(app)/+layout.server.ts` unconditionally redirects if `!locals.user`.

**How to avoid:** Place `/tournaments/[id]` as a top-level route (or in a new `(public)` route group with no auth redirect). Only `/tournaments/[id]/admin` requires auth — check it manually in that load function.

**Warning signs:** Visiting `/tournaments/[id]` without being logged in redirects to login.

### Pitfall 2: FK constraint on player.user_id

**What goes wrong:** Adding `REFERENCES "user"(id)` on `player.user_id` creates a cross-schema dependency that can break Better Auth migrations.

**Why it happens:** Better Auth manages its own `user` table lifecycle.

**How to avoid:** Keep `user_id TEXT NULL` with no FK, same as `organizer_id TEXT` in the `event` table. Use application-level consistency (check existence before insert).

**Warning signs:** Migration fails on FK violation when Better Auth recreates user table.

### Pitfall 3: Player creation race condition on hooks

**What goes wrong:** Two concurrent requests from a new user's first session both try to INSERT into `player`, causing a unique constraint violation (if a unique constraint on `user_id` exists) or duplicate rows (if not).

**Why it happens:** `hooks.server.ts` runs for every request; first login can generate multiple simultaneous requests (browser loads multiple resources).

**How to avoid:** Use `INSERT INTO player ... ON CONFLICT (user_id) DO NOTHING` and ensure a `UNIQUE (user_id)` partial index where `user_id IS NOT NULL`.

**Warning signs:** Duplicate player rows for the same user.

### Pitfall 4: is_registered computation in SQL vs application

**What goes wrong:** Loading all registrations and computing `is_registered` in TypeScript rather than SQL requires loading potentially large arrays and iterating them.

**Why it happens:** It feels simpler to load the data and filter in JS.

**How to avoid:** Compute `is_registered` in SQL using a LEFT JOIN or EXISTS subquery, passing the current user's player_id as a parameter.

```sql
SELECT
  t.id, t.name, t.category,
  COUNT(r.id)::int AS registration_count,
  (r2.id IS NOT NULL) AS is_registered
FROM tournament t
JOIN event e ON e.id = t.event_id
LEFT JOIN tournament_registration r ON r.tournament_id = t.id
LEFT JOIN tournament_registration r2
  ON r2.tournament_id = t.id AND r2.player_id = ${currentPlayerid}
WHERE e.id = ${eventId}
GROUP BY t.id, r2.id
```

**Warning signs:** N+1 queries or loading full registration arrays to check membership.

### Pitfall 5: check_in_required business logic leak

**What goes wrong:** Phase 4 (launch) needs to know which players count as "present." If `check_in_required = false`, all registered players count. If `true`, only checked-in players count. This logic must NOT be duplicated in Phase 3 UI — Phase 3 only displays the column, Phase 4 enforces the rule.

**How to avoid:** Phase 3 only: hide/show the "Présent" column based on `check_in_required`. Do not add launch-blocking logic here.

---

## Code Examples

### Bulk check-in (single UPDATE)

```typescript
// Source: project pattern + postgres.js docs
// /tournaments/[id]/admin/checkin-all/+server.ts
export const POST: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401)
  // ... admin auth check ...

  await sql`
    UPDATE tournament_registration
    SET checked_in = true
    WHERE tournament_id = ${params.id}
  `
  return json({ ok: true })
}
```

### Admin register — existing player or create new

```typescript
// /tournaments/[id]/admin/register/+server.ts
const AdminRegisterSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('existing'), player_id: z.uuid() }),
  z.object({
    mode: z.literal('new'),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    licence_no: z.string().optional()
  })
])

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) error(401)
  // ... admin auth check ...

  const body = AdminRegisterSchema.parse(await request.json())

  let playerId: string

  if (body.mode === 'existing') {
    playerId = body.player_id
  } else {
    const [newPlayer] = await sql<Record<string, unknown>[]>`
      INSERT INTO player (first_name, last_name, birth_date, licence_no)
      VALUES (${body.first_name}, ${body.last_name}, ${body.birth_date}, ${body.licence_no ?? null})
      RETURNING id
    `
    playerId = newPlayer.id as string
  }

  try {
    await sql`
      INSERT INTO tournament_registration (tournament_id, player_id)
      VALUES (${params.id}, ${playerId})
    `
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505') {
      error(409, 'Joueur déjà inscrit')
    }
    throw e
  }

  return json({ ok: true })
}
```

### Svelte autocomplete component (no library)

```svelte
<!-- PlayerSearch.svelte — Claude's discretion on UX -->
<script lang="ts">
  import { Input } from 'flowbite-svelte'

  type Player = { id: string; first_name: string; last_name: string; licence_no: string | null }
  type Props = { tournamentId: string; onSelect: (p: Player) => void }
  let { tournamentId, onSelect }: Props = $props()

  let query = $state('')
  let results = $state<Player[]>([])
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    clearTimeout(timer)
    if (query.length < 2) { results = []; return }
    timer = setTimeout(async () => {
      const res = await fetch(`/tournaments/${tournamentId}/admin/players/search?q=${encodeURIComponent(query)}`)
      results = await res.json()
    }, 300)
  })
</script>

<div class="relative">
  <Input bind:value={query} placeholder="Rechercher un joueur..." />
  {#if results.length > 0}
    <ul class="absolute z-10 w-full bg-white border rounded shadow-lg">
      {#each results as player}
        <li>
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-50"
            onclick={() => { onSelect(player); query = ''; results = [] }}
          >
            {player.last_name} {player.first_name}
            {#if player.licence_no}<span class="text-xs text-gray-400 ml-2">#{player.licence_no}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `interface` types | `type` + `z.infer<>` | Project decision (CLAUDE.md) | All types must derive from Zod schemas |
| FK to Better Auth user | No FK, TEXT column | Phase 1 decision | `player.user_id TEXT` with no FK constraint |
| `sql<unknown[]>` | `sql<Record<string, unknown>[]>` | Phase 2-08 decision | Avoid postgres.js type error |
| phases JSONB | Normalized `phase` table | Phase 2-01 decision | `tournament_registration` uses a proper table, not JSONB |

---

## Open Questions

1. **Player profile creation timing — hooks vs lazy**
   - What we know: `hooks.server.ts` runs on every request; lazy creation (on first register) avoids hooks complexity but means no player row for new users browsing the dashboard
   - What's unclear: Does the dashboard "Tournois disponibles" section need the player row to compute `is_registered`? If so, hooks approach is required.
   - Recommendation: Use hooks with `ON CONFLICT DO NOTHING`. The hooks pattern is simple and idempotent. Add `UNIQUE (user_id) WHERE user_id IS NOT NULL` partial index.

2. **Birth date as required field for auto-created profiles**
   - What we know: `birth_date DATE NOT NULL` is required by the locked decision; but Better Auth `user.name` doesn't include birth date.
   - What's unclear: Should auto-created player profiles use a placeholder birth date (e.g., `1900-01-01`) pending profile completion? Or should the player creation be deferred until the user fills their profile?
   - Recommendation: Use placeholder `1900-01-01` for auto-created profiles; add a profile completion prompt in the dashboard. This keeps the invariant simple. The planner should decide whether to add a profile-edit route in Phase 3 or defer.

3. **`/tournaments/[id]` route group placement**
   - What we know: It must be publicly accessible (no auth required). `(app)/` layout auto-redirects.
   - What's unclear: Should it be a new `(public)` route group or top-level?
   - Recommendation: Place as top-level `src/routes/tournaments/[id]/` — no route group needed. The `admin/` sub-route checks auth manually.

---

## Sources

### Primary (HIGH confidence)
- Project codebase — `/packages/db/src/schema/*.sql` — existing table structures (event, tournament, phase, user, user_entity_role)
- Project codebase — `/packages/front/src/lib/server/schemas/event-schemas.ts` — Zod schema patterns
- Project codebase — `/packages/front/src/routes/(app)/events/+page.server.ts` — SQL query patterns with Zod validation
- Project codebase — `/packages/front/src/lib/server/authz.ts` (inferred from schemas.ts) — existing authz module
- `.planning/phases/03-player-registration/03-CONTEXT.md` — user decisions (locked)
- `.planning/STATE.md` — accumulated architectural decisions (no FK on Better Auth refs, raw SQL, Zod-first)
- `CLAUDE.md` — project coding rules (Zod-first, no inline types, `type` over `interface`)

### Secondary (MEDIUM confidence)
- SvelteKit routing documentation (route groups, public routes pattern) — verified against project structure
- postgres.js error codes — `23505` for unique constraint violation is standard PostgreSQL behavior

### Tertiary (LOW confidence)
- Player search UX debounce timing (300ms) — common convention, not verified against a specific source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — project already uses all required libraries; no new dependencies
- Architecture: HIGH — directly extends established patterns from phases 1 and 2
- DB schema: HIGH — derived from locked decisions and existing migration patterns
- Pitfalls: HIGH — most pitfalls verified against actual codebase decisions (organizer_id no-FK pattern, sql type parameter, etc.)
- Player search UX: MEDIUM — debounce pattern is standard but component design is Claude's discretion

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable stack — SvelteKit, postgres.js, flowbite-svelte versions pinned in package.json)
