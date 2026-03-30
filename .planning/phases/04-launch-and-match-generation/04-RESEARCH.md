# Phase 4: Launch and Match Generation - Research

**Researched:** 2026-03-31
**Domain:** Tournament bracket generation, PostgreSQL transactions, SvelteKit page-based workflow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Déclenchement du lancement**
- Bouton "Lancer" présent à deux endroits : page roster du tournoi (`/tournaments/[tid]`) ET page détail de l'événement (`/events/[id]`)
- Le bouton navigue vers une page dédiée `/admin/events/[id]/tournaments/[tid]/launch`
- La page /launch affiche : récapitulatif des inscrits, avertissements contextuels (peu d'inscrits, check-in incomplet…), aperçu de la structure générée (groupes + nombre de matchs par phase)
- Pas de condition bloquante — le bouton est toujours actif, les avertissements sont informatifs
- Le lancement est confirmé sur la page /launch par un bouton "Confirmer"
- Statut du tournoi après lancement réussi : `started`
- Annulation possible par un admin supérieur : supprime les matchs générés, conserve les inscriptions
- En cas d'échec (rollback) : message d'erreur sur la page /launch, bouton réessayer

**Formation des groupes round-robin**
- Ajouter une option "Seedé" au wizard de création de tournoi (nouvelle propriété sur le tournoi)
- Si seedé : l'admin ordonne les joueurs depuis la page roster avant de lancer
- Si non seedé : ordre aléatoire appliqué à la génération
- La génération traite toujours la liste comme seedée (même logique de distribution)
- Distribution : **snake seeding** — Seed 1 → Groupe A, Seed 2 → B, Seed 3 → C, Seed 4 → C, Seed 5 → B, Seed 6 → A…
- Taille des groupes : `player_per_group` déjà en base de données
- Si le nombre d'inscrits n'est pas divisible : remplir les groupes à `player_per_group`, le dernier groupe reçoit les joueurs restants (groupe plus petit)
- Round-robin : chaque équipe affronte toutes les autres exactement une fois

**Format poule double KO**
- Utilisé pour des poules de typiquement 8 joueurs, 4 qualifiants
- Structure en 3 rounds (bracket fixe, aucune revanche par construction) :
  - **R1 (4 matchs simultanés par paires)** : tout le monde joue → 4 vainqueurs (upper), 4 perdants (lower)
  - **R2 Upper (2 matchs)** : vainqueurs R1 s'affrontent → 2 qualifiés seed 1-2, 2 perdants passent en last-chance
  - **R2 Lower (2 matchs)** : perdants R1 s'affrontent → 2 vainqueurs passent en last-chance, 2 perdants éliminés (2 défaites)
  - **R3 Last chance (2 matchs)** : 2 perdants R2 Upper vs 2 vainqueurs R2 Lower → 2 qualifiés seed 3-4, 2 éliminés
- Contrainte "pas de revanche" garantie par le bracket fixe (pas d'algo spécial nécessaire)

**Phase élimination KO**
- Qualification : `player_per_group_advance` (déjà en base) détermine combien de joueurs par groupe passent en KO
- Seeding croisé dans le bracket : 1er groupe A vs 2e groupe B, 1er groupe B vs 2e groupe A, etc.

**Assignation des arbitres**
- Option par tournoi (déjà configurable via `auto_referee`)
- Algo déterministe (pas d'aléatoire) :
  - Pour chaque match, identifier les équipes non-jouantes à ce même slot temporel
  - Parmi ces équipes disponibles, choisir celle qui a le moins de matchs arbitrés assignés jusqu'ici
- Fonctionne pour singles (joueur) et doubles (équipe)
- Les assignations sont visibles en lecture seule après génération — pas modifiables dans cette phase

**`event_match_id`**
- Chaque match reçoit un `event_match_id` : entier séquentiel unique sur tous les matchs de l'événement (tous tournois confondus)
- Permet la saisie rapide de résultats par ID sur le hub événement (fonctionnalité de saisie = Phase 5)

**Feedback post-lancement**
- Redirection après lancement réussi : `/admin/events/[id]/tournaments/[tid]`
- La page tournoi post-lancement affiche :
  - Poules : tableau par groupe listant les matchs (équipe A vs équipe B, arbitre)
  - Bracket KO : arbre visuel classique avec les slots nommés (noms des joueurs, slots vides en attente)
- L'affichage brackets sera perfectionné en Phase 6

### Claude's Discretion

- Algorithme exact de calcul du `event_match_id` (séquentiel par ordre de génération ou autre)
- Ordre des matchs au sein d'une poule round-robin (rotation standard ou autre)
- Design exact du bracket KO visuel (CSS/composants) — fonctionnel d'abord, esthétique en Phase 6

### Deferred Ideas (OUT OF SCOPE)

- Zone de saisie rapide de résultats par `event_match_id` sur le hub événement — Phase 5
- Modification manuelle des assignations d'arbitres — Phase 5 ou ultérieur
- Perfectionnement visuel des brackets — Phase 6
- Classements et standings dans les poules — Phase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAUNCH-01 | L'admin tournoi peut lancer un tournoi (verrouille la configuration) | Migration `tournament.status = 'started'` + `pg_advisory_xact_lock` guard + SvelteKit `/launch` page with confirm button |
| LAUNCH-02 | Au lancement, le système génère tous les matchs de toutes les phases (round-robin, poules double KO, brackets d'élimination à vide) | New `match` table + pure TypeScript generators for each phase type + `sql.begin()` transaction |
| LAUNCH-03 | La génération est atomique — tout réussit ou tout échoue (transaction PostgreSQL) | `sql.begin()` + `pg_advisory_xact_lock(tournament_id)` pattern already established in codebase |
| LAUNCH-04 | Le format set/manche est configurable par phase avant le lancement | `sets_to_win` + `legs_per_set` columns on the `match` table, sourced from phase `tiers` for elimination or a new phase-level config for group phases |
| LAUNCH-05 | Si l'assignation d'arbitres est activée, le système assigne automatiquement un arbitre à chaque match (joueur inscrit au même tournoi, ne jouant pas ce match) | Deterministic referee assignment algorithm: per-slot availability + least-assigned selection |
</phase_requirements>

---

## Summary

Phase 4 implements the launch workflow for tournaments: a dedicated `/launch` confirmation page, and a single atomic database transaction that generates every match for every tournament phase. The codebase already has all the patterns needed — `sql.begin()` transactions, raw SQL with postgres.js, Zod-first schemas, and SvelteKit page-based navigation. No new libraries are needed.

The core engineering challenge is the match generation algorithms. Three distinct phase types each require their own pure TypeScript generator: round-robin (snake seeding + berger rotation), double KO group (fixed 8-player bracket with 8 predefined match slots), and single elimination (empty bracket with `advances_to_match_id` wiring). The referee assignment algorithm runs after match generation within the same transaction, using a greedy least-assigned approach.

A new `match` table is the only DB schema addition needed. Two new tournament columns are needed: `is_seeded` (for seeding mode) and `seed_order` (JSONB array of team IDs encoding the admin-defined roster order). The `event_match_id` is a sequential integer computed across all tournaments of the event, assigned during generation.

**Primary recommendation:** Implement match generation as pure TypeScript functions that accept roster data and return arrays of match insert rows — then insert all rows in one `sql.begin()` block with an advisory lock. Keep generators pure and unit-testable.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| postgres.js | ^3.4.8 (already installed) | Raw SQL + transactions | Project standard — `sql.begin()` used in publish/teams flows |
| zod | ^4.3.6 (already installed) | Schema validation for new DB rows | Zod-first rule: all domain types derive from schemas |
| SvelteKit | ^2.53.3 (already installed) | Page routing, form actions, load functions | Project framework |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^13.0.0 (already installed) | `crypto.randomUUID()` or `gen_random_uuid()` in SQL | Match ID generation — prefer SQL gen_random_uuid() inside transaction |
| flowbite-svelte | ^1.31.0 (already installed) | UI components for /launch page | Alert, Table, Badge, Button for warning display |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure TS generators | A bracket library (e.g., challonge-api, bracket-algorithm) | Libraries add dependency + don't match exact double-KO-group format; STATE.md decision: "fonctions TypeScript pures" |
| `sql.begin()` | Explicit `BEGIN/COMMIT` SQL | postgres.js `sql.begin()` is the established project pattern — use it |
| `pg_advisory_xact_lock` | Application-level mutex | Advisory lock is transaction-scoped (auto-releases on rollback/commit), safer |

**Installation:** No new packages needed — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/front/src/
├── lib/server/
│   ├── match-generators/          # Pure TS generators (unit-testable)
│   │   ├── round-robin.ts         # Snake seeding + berger round generation
│   │   ├── double-ko-group.ts     # Fixed 8-player double KO bracket
│   │   ├── single-elimination.ts  # Empty bracket with advances_to_match_id wiring
│   │   └── referee-assignment.ts  # Deterministic least-assigned referee algo
│   ├── launch-operations.ts       # Orchestrator: calls generators, inserts in tx
│   └── schemas/
│       └── event-schemas.ts       # Add MatchSchema, LaunchPreviewSchema (Zod-first)
├── routes/
│   ├── api/
│   │   └── tournament/
│   │       └── launch/
│   │           └── +server.ts     # POST handler — calls launch-operations.ts
│   └── (admin)/admin/events/[id]/tournaments/[tid]/
│       ├── launch/
│       │   ├── +page.server.ts    # load: roster summary + phase preview
│       │   └── +page.svelte       # Confirmation page with warnings + preview
│       └── +page.svelte           # Add "Lancer" button + post-launch match display
packages/db/src/schema/
└── 016_match.sql                  # New match table + tournament.is_seeded + seed_order
```

### Pattern 1: Atomic Launch Transaction

**What:** All match generation and status update happen inside a single `sql.begin()` with an advisory lock to prevent concurrent double-launch.

**When to use:** Any write that must be all-or-nothing across multiple tables.

```typescript
// Source: established pattern in packages/front/src/routes/api/event/publish/+server.ts
// and packages/front/src/lib/server/teams.ts

import { sql } from "$lib/server/db.js"

export type TxSql = postgres.Sql  // rawTx cast — established project pattern

export async function launchTournament(tournamentId: string, eventId: string): Promise<void> {
  await sql.begin(async (rawTx) => {
    const tx = rawTx as unknown as TxSql

    // Advisory lock: prevents concurrent launch of same tournament
    // pg_advisory_xact_lock takes a bigint — hash tournament UUID to int
    await tx`SELECT pg_advisory_xact_lock(hashtext(${tournamentId}))`

    // Guard: re-read status inside transaction (prevent race condition)
    const [row] = await tx<{ status: string }[]>`
      SELECT status FROM tournament WHERE id = ${tournamentId} FOR UPDATE
    `
    if (row.status !== 'ready' && row.status !== 'check-in') {
      throw new Error('ALREADY_LAUNCHED')
    }

    // Determine active roster (check_in_required ? only checked_in : all)
    const roster = await loadRoster(tx, tournamentId)

    // Generate all matches (pure functions, called here)
    const matches = generateAllMatches(tournament, phases, roster, eventId)

    // Insert matches
    for (const m of matches) {
      await tx`INSERT INTO match ${tx(m)}`
    }

    // Lock tournament
    await tx`UPDATE tournament SET status = 'started', updated_at = now() WHERE id = ${tournamentId}`
  })
}
```

### Pattern 2: Pure Match Generator Functions

**What:** Each phase type is a pure function: `(teams: TeamId[], phase: Phase, config: GenConfig) => MatchInsertRow[]`. No DB access inside generators.

**When to use:** All match generation logic — keeps it testable with Vitest without DB.

```typescript
// Source: project convention (pure TS functions — see STATE.md)
// round-robin.ts
export function generateRoundRobinMatches(
  groups: TeamId[][],   // pre-distributed groups
  phaseId: string,
  config: { legsPerSet: number; setsToWin: number },
): MatchInsertRow[] {
  const matches: MatchInsertRow[] = []
  for (const group of groups) {
    const rounds = bergerRounds(group)  // standard berger rotation
    for (const round of rounds) {
      for (const [teamA, teamB] of round) {
        matches.push({
          id: crypto.randomUUID(),
          phase_id: phaseId,
          team_a_id: teamA,
          team_b_id: teamB,
          sets_to_win: config.setsToWin,
          legs_per_set: config.legsPerSet,
          status: 'pending',
        })
      }
    }
  }
  return matches
}
```

### Pattern 3: Snake Seeding Distribution

**What:** Distribute seeded teams into groups using snake order — zigzag across groups.

**When to use:** Round-robin and double-KO group phase distribution.

```typescript
// Source: CONTEXT.md decision + standard snake seeding algorithm
export function snakeDistribute(teams: TeamId[], groupCount: number): TeamId[][] {
  const groups: TeamId[][] = Array.from({ length: groupCount }, () => [])
  let direction = 1
  let groupIdx = 0
  for (const team of teams) {
    groups[groupIdx].push(team)
    groupIdx += direction
    if (groupIdx >= groupCount || groupIdx < 0) {
      direction *= -1
      groupIdx += direction
    }
  }
  return groups
}
// Example: 6 teams, 3 groups → [A,F] [B,E] [C,D]
```

### Pattern 4: `event_match_id` Sequential Counter

**What:** Unique sequential integer per event across all tournaments. Computed during generation by counting pre-existing matches in the event and offsetting.

**Recommendation (Claude's discretion):** Use a PostgreSQL sequence scoped per event or compute offset as `SELECT COUNT(*) FROM match WHERE event_id = $eventId` at the start of the transaction, then increment in-memory. The in-memory approach is simpler and safe inside the advisory-locked transaction.

```typescript
// Inside launchTournament transaction:
const [{ base }] = await tx<{ base: number }[]>`
  SELECT COUNT(*)::int AS base
  FROM match m
  JOIN phase p ON p.id = m.phase_id
  JOIN tournament t ON t.id = p.tournament_id
  WHERE t.event_id = ${eventId}
`
let nextMatchId = base + 1
// Then assign nextMatchId++ to each generated match
```

### Pattern 5: Double-KO Group Fixed Bracket

**What:** For each group of 8 teams, generate exactly 8 matches with fixed `advances_to_match_id` wiring. Teams are known at launch (no empty slots in group phase).

**Structure (R1=4 matches, R2Upper=2, R2Lower=2, R3=2):**

```
R1: M1(S1 vs S8), M2(S2 vs S7), M3(S3 vs S6), M4(S4 vs S5)
  winners → R2Upper: M5(W-M1 vs W-M2), M6(W-M3 vs W-M4)
  losers  → R2Lower: M7(L-M1 vs L-M4), M8(L-M2 vs L-M3)  [no-rematch by construction]
R3: M9(L-M5 vs W-M7), M10(L-M6 vs W-M8)
Qualifiers: W-M5(seed1), W-M6(seed2), W-M9(seed3), W-M10(seed4)
```

All 8 matches are insertable at generation time with `advances_to_match_id` pointing to downstream matches. The `team_a_id`/`team_b_id` for R2/R3 are NULL at creation (`advances_from_match_id` links resolve on result entry — Phase 5).

### Pattern 6: Single Elimination Empty Bracket

**What:** Generate bracket slots (leaf to root) with `advances_to_match_id` linking. Team slots are NULL — filled when phase starts (Phase 5).

**Size:** Number of slots = next power of 2 ≥ number of qualifiers. BYEs fill the remainder.

```typescript
// For 8-slot bracket: 4 QF, 2 SF, 1 Final = 7 matches
// Leaf matches (QF) get team_a_id/team_b_id = NULL (filled when KO phase starts)
// advances_to_match_id links QF→SF→Final
export function generateSingleEliminationBracket(
  slotCount: number,   // next power of 2 ≥ qualifiers
  phaseId: string,
  tiers: BracketTier[],
): MatchInsertRow[] { ... }
```

### Anti-Patterns to Avoid

- **Match generation inside SQL:** Never compute round-robin pairings in SQL (CTEs). Generate in TypeScript, insert rows. Keeps logic testable.
- **Skipping the advisory lock:** Without `pg_advisory_xact_lock`, two concurrent launch requests can both pass the status guard and double-insert matches. The lock is mandatory (documented in STATE.md blockers).
- **Inserting matches one-by-one in a loop with individual transactions:** All matches for a tournament must be in one `sql.begin()` block — LAUNCH-03 requires atomicity.
- **Using `tournament.status = 'started'` as the only concurrency guard:** Status check without `FOR UPDATE` is a race condition. Use advisory lock + `FOR UPDATE` together.
- **Inline types for match rows:** All domain types must derive from Zod schemas per project absolute rule.

---

## DB Schema: New Migration (016_match.sql)

This is the central schema work for Phase 4. Nothing like this exists yet in the codebase.

### New `match` table

```sql
-- 016_match.sql
CREATE TABLE match (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id              UUID NOT NULL REFERENCES phase(id) ON DELETE CASCADE,
  event_match_id        INTEGER NOT NULL,         -- sequential per event, for fast entry
  group_number          INTEGER,                  -- NULL for elimination; 0-based group index
  round_number          INTEGER NOT NULL DEFAULT 0, -- 0-based round within phase
  position              INTEGER NOT NULL DEFAULT 0, -- 0-based position within round
  team_a_id             UUID REFERENCES team(id) ON DELETE SET NULL,
  team_b_id             UUID REFERENCES team(id) ON DELETE SET NULL,
  referee_team_id       UUID REFERENCES team(id) ON DELETE SET NULL,
  advances_to_match_id  UUID REFERENCES match(id) ON DELETE SET NULL,
  -- result fields (Phase 5)
  score_a               INTEGER,
  score_b               INTEGER,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending | ongoing | done | walkover
  sets_to_win           INTEGER NOT NULL DEFAULT 2,
  legs_per_set          INTEGER NOT NULL DEFAULT 3,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX match_phase_idx ON match(phase_id);
CREATE INDEX match_event_match_id_idx ON match(event_match_id);
-- Unique event_match_id per event requires a partial index or application-level enforcement
-- (event_id not on match table — go through phase → tournament → event)
-- Recommend: enforce uniqueness at generation time (sequential counter in advisory-locked tx)
```

### New columns on `tournament`

```sql
-- Also in 016_match.sql
ALTER TABLE tournament ADD COLUMN is_seeded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tournament ADD COLUMN seed_order JSONB NOT NULL DEFAULT '[]';
-- seed_order: array of team IDs (UUIDs) in admin-defined seed order
-- Empty array = no seed order set (use registration order or random)
```

### `phase` table: match format config

The existing `phase` table needs per-phase match format. For elimination phases, `tiers` already stores `{round, legs}` arrays. For group phases (round_robin, double_loss_groups), a new column is needed:

```sql
ALTER TABLE phase ADD COLUMN sets_to_win  INTEGER NOT NULL DEFAULT 2;
ALTER TABLE phase ADD COLUMN legs_per_set INTEGER NOT NULL DEFAULT 3;
-- For elimination phases, legs_per_set is read from tiers[] per round
-- For group phases, these columns apply to all matches in the phase
```

**Note:** LAUNCH-04 requires match format configurable per phase before launch. This is the mechanism.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent launch prevention | Custom application mutex, Redis lock | `pg_advisory_xact_lock(hashtext(tournament_id))` | Transaction-scoped, auto-releases on rollback, zero extra infrastructure |
| BYE placement in single elimination | Custom odd-size bracket logic | Power-of-2 expansion: next power of 2 ≥ qualifiers, fill tail slots as BYEs | Standard approach, well-defined, correct for all sizes |
| Round-robin schedule | Custom pairing loop | Berger round-robin rotation (also called "circle method") | Generates all pairs in ⌈n-1⌉ rounds, well-known algorithm, no library needed |

**Key insight:** Match generation for this problem size (max ~64 teams per phase) is simple enough for pure TypeScript. The complexity is in correctness and atomicity, not performance.

---

## Common Pitfalls

### Pitfall 1: Double Launch Race Condition

**What goes wrong:** Two concurrent requests both read `status = 'check-in'`, both pass the guard, both insert matches, creating duplicate match records.

**Why it happens:** Status check outside a transaction lock.

**How to avoid:** Use `pg_advisory_xact_lock(hashtext(tournament_id))` + `SELECT ... FOR UPDATE` on the tournament row inside `sql.begin()`. The advisory lock serializes concurrent launch attempts for the same tournament.

**Warning signs:** Duplicate `event_match_id` values, match count is double what's expected.

### Pitfall 2: `advances_to_match_id` Foreign Key on Self-Referential Insert

**What goes wrong:** Inserting match rows with `advances_to_match_id` referencing matches not yet inserted (violates FK constraint).

**Why it happens:** Trying to insert leaf matches before parent matches.

**How to avoid:** Insert matches from final (root) to leaf (bottom of bracket), or collect all match objects in memory, assign IDs upfront (crypto.randomUUID()), then insert in dependency order (root first, then downstream). Alternatively, insert all as NULL for `advances_to_match_id`, then UPDATE in a second pass within the same transaction.

**Recommended approach:** Generate all match rows in TypeScript with pre-assigned UUIDs (`crypto.randomUUID()`), insert root/parent matches first, then leaf matches.

### Pitfall 3: Check-in Roster vs Full Roster

**What goes wrong:** Tournament has `check_in_required = true` but generation uses all registered teams including no-shows.

**Why it happens:** Load function fetches all registrations without filtering by `checked_in`.

**How to avoid:** In the launch transaction, filter: `WHERE r.tournament_id = $tid AND ($check_in_required = false OR r.checked_in = true)`.

### Pitfall 4: `event_match_id` Uniqueness Across Tournaments

**What goes wrong:** Two tournaments launched concurrently get overlapping `event_match_id` ranges.

**Why it happens:** Counting existing matches at the start of each transaction reads a snapshot before the other tournament commits.

**How to avoid:** Compute the `event_match_id` offset inside the advisory-locked transaction for one tournament at a time. Since launches are serialized per tournament but not per event, also take an event-level advisory lock: `pg_advisory_xact_lock(hashtext(event_id))` to prevent two tournaments in the same event launching simultaneously. This ensures sequential, non-overlapping IDs.

### Pitfall 5: Snake Seeding Off-by-One for Odd Group Counts

**What goes wrong:** With 7 teams and 2 groups, snake distribution puts 4 in group A and 3 in group B, but the last group is expected to receive extras per CONTEXT.md.

**Why it happens:** Snake algorithm puts extras in the first group, not the last.

**How to avoid:** Per CONTEXT.md: "remplir les groupes à `player_per_group`, le dernier groupe reçoit les joueurs restants." This is a different rule from pure snake seeding. Implementation: compute `groupCount = Math.floor(teamCount / playersPerGroup)`, run snake for `groupCount * playersPerGroup` teams, then append remaining teams to the last group.

### Pitfall 6: Phase Legs Config Not Persisted Before Launch

**What goes wrong:** Admin configures legs/sets in the wizard but Phase 4 reads the phase row from DB and it has default values.

**Why it happens:** The `sets_to_win` / `legs_per_set` columns don't exist yet on `phase` table.

**How to avoid:** Migration 016 must add these columns AND the wizard must be updated to persist them (or at minimum the launch page shows them with defaults). This is a dependency: wizard update before launch.

---

## Code Examples

### Berger Round-Robin Rotation

```typescript
// Source: standard "circle method" algorithm (well-known CS algorithm)
// For n teams (n even), generates n-1 rounds of n/2 matches each.
// If n is odd, add a BYE team to make it even.
export function bergerRounds(teams: string[]): [string, string][][] {
  const n = teams.length % 2 === 0 ? teams.length : teams.length + 1
  const padded = teams.length % 2 === 0 ? [...teams] : [...teams, 'BYE']
  const fixed = padded[0]
  let rotating = padded.slice(1)
  const rounds: [string, string][][] = []
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = []
    round.push([fixed, rotating[n / 2 - 1]])
    for (let i = 0; i < n / 2 - 1; i++) {
      round.push([rotating[i], rotating[n - 2 - i]])
    }
    rounds.push(round.filter(([a, b]) => a !== 'BYE' && b !== 'BYE'))
    rotating = [rotating[n - 2], ...rotating.slice(0, n - 2)]
  }
  return rounds
}
```

### `sql.begin()` Transaction with Advisory Lock

```typescript
// Source: pattern from packages/front/src/routes/api/event/publish/+server.ts
// and STATE.md Phase 4 note: "pg_advisory_xact_lock(tournament_id) obligatoire"
import { sql } from "$lib/server/db.js"
import type postgres from "postgres"

type TxSql = postgres.Sql  // established project cast

await sql.begin(async (rawTx) => {
  const tx = rawTx as unknown as TxSql
  // Serialize all launches for this event to prevent event_match_id collisions
  await tx`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`
  // ... rest of generation
})
```

### SvelteKit POST Action Pattern (for /launch confirm button)

The launch confirm can use either a SvelteKit form action (page server action) OR a fetch to `/api/tournament/launch`. Given the codebase uses API routes for mutations, use:

```typescript
// packages/front/src/routes/api/tournament/launch/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return error(401)
  const { tournament_id } = await request.json()
  // authz check
  // call launchTournament(tournament_id, event_id)
  // on success: return json({ ok: true })
  // on error: return json({ error: '...' }, { status: 500 })
}
```

```typescript
// packages/front/src/lib/fetch/api.ts — add entry:
TOURNAMENT_LAUNCH: { method: ["POST"], path: "/api/tournament/launch" },
TOURNAMENT_CANCEL: { method: ["POST"], path: "/api/tournament/cancel" },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `phases` JSONB on tournament | Normalized `phase` table | Migration 008 | Phase data is relational; match FK references `phase.id` |
| `player_id` on registration | `team_id` on registration (team of 1 for singles) | Migration 013 | Matches reference teams, not players directly |
| `entrants` column on phase | Dropped | Migration 009 | Roster count is computed at runtime from `tournament_registration` |
| `qualifiers` column on phase | `qualifiers_count` | Migration 009 | Rename — use `qualifiers_count` in all new code |

**Key schema facts for this phase:**
- `tournament_registration.team_id` — teams are the first-class participants
- `phase.players_per_group` — already in DB for group phases (not `player_per_group`)
- `phase.qualifiers_per_group` — already in DB for group phases
- `phase.qualifiers_count` — already in DB for elimination phases
- `phase.tiers` — JSONB `[{round, legs}]` for elimination phases
- `tournament.auto_referee` — boolean, already in DB
- `tournament.status` — `ready | check-in | started | finished`

---

## Open Questions

1. **`sets_to_win` / `legs_per_set` for group phases — where is it configured?**
   - What we know: The wizard stores elimination `tiers` with `legs` per round. No equivalent exists for group phases.
   - What's unclear: Should a group phase have a single `sets_to_win`/`legs_per_set`, or should the launch page prompt for it?
   - Recommendation: Add `sets_to_win INTEGER NOT NULL DEFAULT 2` and `legs_per_set INTEGER NOT NULL DEFAULT 3` to the `phase` table (migration 016). Surface them in the wizard's phase configuration UI. The `/launch` page shows the current values as part of its preview.

2. **`seed_order` column type — JSONB array of team IDs vs separate table**
   - What we know: ORDER of teams on roster page should map to seed order.
   - What's unclear: Is the roster page's drag-to-reorder sufficient, or is a separate seeding UI needed?
   - Recommendation: Add `seed_order JSONB DEFAULT '[]'` to `tournament`. A drag-to-reorder interaction on the roster page (when `is_seeded = true`) updates this column via a new PATCH API call. Simple and sufficient for Phase 4.

3. **Phase format config (LAUNCH-04) in wizard vs at launch page**
   - What we know: CONTEXT.md says "Le format set/manche est configurable par phase avant le lancement."
   - What's unclear: Does the wizard need to be updated to expose these fields, or is it a Phase 4 addition to the tournament detail page?
   - Recommendation: Add to the phase configuration step in the existing wizard (PhasesBuilder). This keeps all tournament config in one place and avoids a separate pre-launch configuration step.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — section omitted.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `packages/db/src/schema/` (all 15 migrations), `event-schemas.ts`, `event-operations.ts`, `teams.ts`, `publish/+server.ts`
- STATE.md `## Blockers/Concerns` — "pg_advisory_xact_lock(tournament_id) obligatoire pour prevenir double-launch" (project team already identified this)
- STATE.md `## Decisions` — "Generation brackets: fonctions TypeScript pures (pas de bibliotheque externe)"

### Secondary (MEDIUM confidence)

- Berger round-robin rotation algorithm — standard CS algorithm (circle method), widely documented, no library needed
- Snake seeding distribution — standard tournament seeding method, CONTEXT.md specifies the exact behavior

### Tertiary (LOW confidence)

- Optimal referee assignment greedy algorithm — described in CONTEXT.md; edge cases for sparse referees not fully specified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture patterns: HIGH — transaction pattern, pure function generators, and Zod-first schemas directly derived from existing codebase
- DB schema: HIGH — directly read from existing migrations + new columns clearly needed
- Match generation algorithms: MEDIUM — berger/snake are well-known; double-KO bracket wiring requires careful implementation
- Referee assignment edge cases: LOW — CONTEXT.md describes the happy path; sparse-referee scenarios (fewer referees than slots) not fully specified

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain — no fast-moving dependencies)
